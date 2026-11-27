begin;

alter table fasttrip_internal.play_test_settings
  add column if not exists invitation uuid;
update fasttrip_internal.play_test_settings
set invitation = gen_random_uuid()
where enabled and invitation is null;

-- Older clients must keep their normal registration flow.
create or replace function public.play_test_is_open()
returns boolean language sql stable security invoker set search_path = ''
as $$ select false $$;

create or replace function public.play_test_invitation_open(p_invite uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select from fasttrip_internal.play_test_settings
    where singleton and enabled and invitation = p_invite
  )
$$;
revoke all on function public.play_test_invitation_open(uuid) from public, anon, authenticated;
grant execute on function public.play_test_invitation_open(uuid) to anon, authenticated;

create or replace function public.reserve_play_test_invited_enrollment(
  p_key uuid, p_role public.app_role, p_name text, p_phone text, p_invite uuid
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from fasttrip_internal.play_test_settings
  where singleton and enabled and invitation = p_invite for update;
  if not found then return false; end if;
  return public.reserve_play_test_enrollment(p_key,p_role,p_name,p_phone);
end;
$$;
revoke all on function public.reserve_play_test_invited_enrollment(uuid,public.app_role,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_play_test_invited_enrollment(uuid,public.app_role,text,text,uuid)
  to service_role;
revoke execute on function public.reserve_play_test_enrollment(uuid,public.app_role,text,text)
  from service_role;

create or replace function fasttrip_internal.is_review_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from fasttrip_internal.app_review_users where user_id=p_user_id)
    or coalesce(p_user_id = auth.uid()
      and auth.jwt()->'app_metadata'->>'fast_trip_play_test' in ('passenger','driver'), false)
$$;

-- Test accounts use a simulated vehicle and never upload operational documents.
drop policy if exists play_test_no_storage_insert on storage.objects;
create policy play_test_no_storage_insert on storage.objects as restrictive for insert to authenticated
  with check (coalesce(auth.jwt()->'app_metadata'->>'fast_trip_play_test','') not in ('passenger','driver'));
drop policy if exists play_test_no_storage_update on storage.objects;
create policy play_test_no_storage_update on storage.objects as restrictive for update to authenticated
  using (coalesce(auth.jwt()->'app_metadata'->>'fast_trip_play_test','') not in ('passenger','driver'))
  with check (coalesce(auth.jwt()->'app_metadata'->>'fast_trip_play_test','') not in ('passenger','driver'));

create or replace function fasttrip_internal.delete_closed_play_test()
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  participants uuid[];
  units uuid[];
  rides uuid[];
begin
  if exists (select from fasttrip_internal.play_test_settings where singleton and enabled)
  then raise exception 'Cierra la prueba antes de eliminar sus registros'; end if;

  select coalesce(array_agg(u.id), '{}') into participants
  from auth.users u join fasttrip_internal.play_test_enrollments e
    on u.email = 'play-test-' || e.enrollment_key::text || '@example.com'
   and u.raw_app_meta_data->>'fast_trip_play_test' = e.role::text
  where (e.user_id is null or e.user_id=u.id)
    and not exists(select from public.profiles p where p.id=u.id and p.role<>e.role);

  if exists (select from fasttrip_internal.play_test_enrollments where user_id is not null and not user_id=any(participants))
  then raise exception 'Hay una cuenta de prueba cuya identidad no pudo verificarse'; end if;
  if exists (select from storage.objects o where o.owner_id in (select id::text from unnest(participants) as ids(id)))
  then raise exception 'Hay archivos privados de prueba pendientes de eliminar'; end if;

  select coalesce(array_agg(v.id), '{}') into units from public.vehicles v
    where v.driver_id=any(participants) and v.unit_number like 'PRUEBA-%';
  if exists(select from public.vehicles where driver_id=any(participants) and not id=any(units))
  then raise exception 'Una cuenta de prueba tiene un vehículo operativo'; end if;

  select coalesce(array_agg(t.id), '{}') into rides from public.trips t
    where t.passenger_id=any(participants);
  if exists(select from public.trips where (driver_id=any(participants) or vehicle_id=any(units)) and not id=any(rides))
  then raise exception 'Hay una asignación cruzada con un viaje ajeno a esta prueba'; end if;

  delete from public.next_trip_reservations where passenger_id=any(participants) or driver_id=any(participants)
    or current_trip_id=any(rides) or next_trip_id=any(rides);
  delete from public.trip_cancellation_requests where requester_id=any(participants) or trip_id=any(rides);
  delete from public.trip_change_requests where driver_id=any(participants) or passenger_id=any(participants) or trip_id=any(rides);
  delete from public.trip_ratings where rater_id=any(participants) or rated_user_id=any(participants);
  delete from public.trip_gps_history where driver_id=any(participants);
  delete from public.trip_gps_points where driver_id=any(participants);
  delete from private.shared_trip_links where trip_id=any(rides);
  update public.trips set adolescent_request_id=null where id=any(rides) and adolescent_request_id is not null;
  delete from public.adolescent_trip_requests where passenger_id=any(participants) or trip_id=any(rides);
  delete from public.security_incidents where trip_id=any(rides);
  delete from public.trips where id=any(rides);
  delete from private.passenger_guardians where passenger_id=any(participants);
  delete from public.premium_reservations where passenger_id=any(participants);
  delete from public.vehicle_age_notifications where driver_id=any(participants) or vehicle_id=any(units);
  delete from public.vehicle_change_requests where driver_id=any(participants);
  delete from public.vehicles where id=any(units);
  delete from public.driver_documents where driver_id=any(participants);
  delete from public.driver_payment_exemptions where driver_id=any(participants);
  delete from public.driver_payments where driver_id=any(participants);
  delete from public.driver_unit_limits where driver_id=any(participants);
  delete from public.driver_gps_history where driver_id=any(participants);
  delete from public.suggestions where user_id=any(participants);
  delete from auth.users where id=any(participants);
  delete from fasttrip_internal.play_test_enrollments where user_id is null;
end
$$;
revoke all on function fasttrip_internal.delete_closed_play_test() from public, anon, authenticated, service_role;

create or replace function public.manage_play_test(p_action text default 'list', p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare enabled_now boolean;
declare invite uuid;
declare enrollment fasttrip_internal.play_test_enrollments%rowtype;
declare test_unit text;
begin
  if not public.is_approved_admin() then
    raise exception 'Acceso restringido a Administración';
  end if;
  select enabled, invitation into enabled_now, invite from fasttrip_internal.play_test_settings where singleton for update;
  if p_action = 'close' then
    update fasttrip_internal.play_test_settings set enabled=false, invitation=null where singleton;
    perform fasttrip_internal.delete_closed_play_test();
    enabled_now := false;
    invite := null;
  elsif p_action = 'open' then
    update fasttrip_internal.play_test_settings set enabled=true, invitation=coalesce(invitation,gen_random_uuid())
    where singleton returning invitation into invite;
    enabled_now := true;
  elsif p_action in ('approve', 'reject') then
    if not enabled_now then raise exception 'La prueba está cerrada'; end if;
    select * into enrollment from fasttrip_internal.play_test_enrollments where user_id = p_user_id;
    if not found then raise exception 'Solicitud de prueba no encontrada'; end if;
    if p_action = 'approve' then
      update public.profiles set status = 'approved' where id = p_user_id and status in ('pending', 'suspended');
      if not found then raise exception 'Esta solicitud ya fue revisada'; end if;
      if enrollment.role = 'driver' then
        test_unit := 'PRUEBA-' || enrollment.enrollment_key::text;
        insert into public.driver_payment_exemptions(driver_id, reason)
        values (p_user_id, 'FAST TRIP closed Play test') on conflict (driver_id) do nothing;
        insert into public.vehicles(driver_id, plate, unit_number, make_model, status, model_year)
        values (p_user_id, test_unit, test_unit, 'Vehículo de prueba', 'enabled', extract(year from current_date)::int)
        on conflict (plate) do update set status = 'enabled', model_year = excluded.model_year
        where vehicles.driver_id = excluded.driver_id;
      end if;
    else
      update public.profiles set status = 'rejected', is_available = false
      where id = p_user_id and status in ('pending', 'suspended');
      if not found then raise exception 'Esta solicitud ya fue revisada'; end if;
    end if;
  elsif p_action <> 'list' then
    raise exception 'Acción de prueba desconocida';
  end if;
  return jsonb_build_object(
    'enabled', enabled_now,
    'invitation', invite,
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'role', e.role, 'full_name', e.full_name, 'phone', e.phone,
        'status', p.status, 'created_at', e.created_at
      ) order by e.created_at desc)
      from fasttrip_internal.play_test_enrollments e join public.profiles p on p.id = e.user_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.manage_play_test(text, uuid) from public, anon, authenticated;
grant execute on function public.manage_play_test(text, uuid) to authenticated;

commit;
