begin;

create table if not exists fasttrip_internal.play_test_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into fasttrip_internal.play_test_settings default values on conflict do nothing;
alter table fasttrip_internal.play_test_settings enable row level security;

create table if not exists fasttrip_internal.play_test_enrollments (
  enrollment_key uuid primary key,
  role public.app_role not null check (role in ('driver', 'passenger')),
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (phone ~ '^09[0-9]{8}$'),
  user_id uuid unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role, phone)
);
alter table fasttrip_internal.play_test_enrollments enable row level security;

create or replace function public.play_test_is_open()
returns boolean language sql stable security definer set search_path = ''
as $$
  select enabled from fasttrip_internal.play_test_settings where singleton;
$$;
revoke all on function public.play_test_is_open() from public, anon, authenticated;
grant execute on function public.play_test_is_open() to anon, authenticated;

create or replace function public.reserve_play_test_enrollment(
  p_key uuid, p_role public.app_role, p_name text, p_phone text
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare existing fasttrip_internal.play_test_enrollments%rowtype;
begin
  if not (select enabled from fasttrip_internal.play_test_settings where singleton for update) then
    return false;
  end if;
  select * into existing from fasttrip_internal.play_test_enrollments where enrollment_key = p_key;
  if found then
    return existing.role = p_role and existing.phone = p_phone and existing.full_name = p_name;
  end if;
  if (select count(*) from fasttrip_internal.play_test_enrollments where role = p_role) >= 100 then
    return false;
  end if;
  insert into fasttrip_internal.play_test_enrollments(enrollment_key, role, full_name, phone)
  values (p_key, p_role, p_name, p_phone) on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.reserve_play_test_enrollment(uuid, public.app_role, text, text) from public, anon, authenticated;
grant execute on function public.reserve_play_test_enrollment(uuid, public.app_role, text, text) to service_role;

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
    return enrollment.user_id = p_user_id;
  end if;
  insert into public.profiles(id, role, full_name, phone, status)
  values (p_user_id, enrollment.role, enrollment.full_name, enrollment.phone, 'pending');
  insert into fasttrip_internal.app_review_users(user_id, purpose)
  values (p_user_id, 'FAST TRIP closed Play test');
  update fasttrip_internal.play_test_enrollments set user_id = p_user_id where enrollment_key = p_key;
  return true;
end;
$$;
revoke all on function public.finish_play_test_enrollment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finish_play_test_enrollment(uuid, uuid) to service_role;

create or replace function public.manage_play_test(p_action text default 'list', p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare enabled_now boolean;
declare enrollment fasttrip_internal.play_test_enrollments%rowtype;
declare test_unit text;
begin
  if not public.is_approved_admin() then
    raise exception 'Acceso restringido a Administración';
  end if;
  select enabled into enabled_now from fasttrip_internal.play_test_settings where singleton for update;
  if p_action = 'close' then
    update fasttrip_internal.play_test_settings set enabled = false where singleton;
    update public.profiles p set status = 'suspended', is_available = false
    from fasttrip_internal.play_test_enrollments e
    where e.user_id = p.id and p.status in ('approved', 'pending');
    update public.vehicles v set status = 'blocked'
    from fasttrip_internal.play_test_enrollments e
    where v.driver_id = e.user_id and v.unit_number = 'PRUEBA-' || e.enrollment_key::text;
    delete from public.driver_payment_exemptions x using fasttrip_internal.play_test_enrollments e
    where x.driver_id = e.user_id and x.reason = 'FAST TRIP closed Play test';
    enabled_now := false;
  elsif p_action = 'open' then
    update fasttrip_internal.play_test_settings set enabled = true where singleton;
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

-- Preserve the isolation used by existing Play review accounts and prevent
-- participants from mutating test trips after Administration ends the trial.
create or replace function fasttrip_internal.guard_review_trip()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_approved_admin() then
    if exists (
      select 1 from fasttrip_internal.play_test_enrollments e join public.profiles p on p.id = e.user_id
      where e.user_id = auth.uid() and p.status <> 'approved'
    ) then
      raise exception 'La cuenta de prueba no está habilitada';
    end if;
    if fasttrip_internal.is_review_user(auth.uid()) is distinct from fasttrip_internal.is_review_user(new.passenger_id) then
      raise exception 'Los viajes de revisión están separados de los servicios de clientes';
    end if;
  end if;
  if new.driver_id is not null and fasttrip_internal.is_review_user(new.driver_id) is distinct from fasttrip_internal.is_review_user(new.passenger_id) then
    raise exception 'Una cuenta de revisión solo puede atender viajes de revisión';
  end if;
  return new;
end;
$$;
commit;
