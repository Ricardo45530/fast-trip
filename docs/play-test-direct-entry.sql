-- Enrollments and the test flag are the sole source of eligibility.
create or replace function fasttrip_internal.activate_pending_play_test(p_user_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare enrollment fasttrip_internal.play_test_enrollments%rowtype;
declare test_unit text;
begin
  select * into enrollment from fasttrip_internal.play_test_enrollments where user_id = p_user_id;
  if not found or not fasttrip_internal.is_review_user(p_user_id) then return; end if;

  update public.profiles set status = 'approved'
  where id = p_user_id and status = 'pending' and role = enrollment.role;
  if not found or enrollment.role <> 'driver' then return; end if;

  test_unit := 'PRUEBA-' || enrollment.enrollment_key::text;
  insert into public.driver_payment_exemptions(driver_id, reason)
  values (p_user_id, 'FAST TRIP closed Play test') on conflict (driver_id) do nothing;
  insert into public.vehicles(driver_id, plate, unit_number, make_model, status, model_year)
  values (p_user_id, test_unit, test_unit, 'Vehículo de prueba', 'enabled', extract(year from current_date)::int)
  on conflict (plate) do update set status = 'enabled', model_year = excluded.model_year
  where vehicles.driver_id = excluded.driver_id and vehicles.unit_number = excluded.unit_number;
end;
$$;
revoke all on function fasttrip_internal.activate_pending_play_test(uuid) from public, anon, authenticated, service_role;

create or replace function public.finish_play_test_enrollment(p_key uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare enrollment fasttrip_internal.play_test_enrollments%rowtype;
begin
  if not (select enabled from fasttrip_internal.play_test_settings where singleton for share) then
    return false;
  end if;
  select * into enrollment from fasttrip_internal.play_test_enrollments
  where enrollment_key = p_key for update;
  if not found or not exists (
    select 1 from auth.users
    where id = p_user_id and raw_app_meta_data->>'fast_trip_play_test' = enrollment.role::text
      and email = 'play-test-' || p_key::text || '@example.com'
  ) then
    return false;
  end if;
  if enrollment.user_id is not null then
    if enrollment.user_id is distinct from p_user_id then return false; end if;
    perform fasttrip_internal.activate_pending_play_test(p_user_id);
    return true;
  end if;
  insert into public.profiles(id, role, full_name, phone, status)
  values (p_user_id, enrollment.role, enrollment.full_name, enrollment.phone, 'pending');
  insert into fasttrip_internal.app_review_users(user_id, purpose)
  values (p_user_id, 'FAST TRIP closed Play test');
  update fasttrip_internal.play_test_enrollments set user_id = p_user_id where enrollment_key = p_key;
  perform fasttrip_internal.activate_pending_play_test(p_user_id);
  return true;
end;
$$;
revoke all on function public.finish_play_test_enrollment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finish_play_test_enrollment(uuid, uuid) to service_role;

do $$
declare pending_user uuid;
begin
  if (select enabled from fasttrip_internal.play_test_settings where singleton for update) then
    for pending_user in
      select e.user_id from fasttrip_internal.play_test_enrollments e
      join public.profiles p on p.id = e.user_id where p.status = 'pending'
    loop
      perform fasttrip_internal.activate_pending_play_test(pending_user);
    end loop;
  end if;
end;
$$;
