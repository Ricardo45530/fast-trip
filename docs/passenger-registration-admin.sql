alter table public.passenger_registration_requests
 add column if not exists reviewed_at timestamptz,
 add column if not exists reviewed_by uuid references public.profiles(id);

revoke insert on public.passenger_registration_requests from anon;
grant insert(full_name,national_id,phone,email,address,city) on public.passenger_registration_requests to anon;
grant select on public.passenger_registration_requests to authenticated;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='passenger_registration_requests' and policyname='passenger_registration_admin_read') then
  create policy passenger_registration_admin_read on public.passenger_registration_requests
   for select to authenticated using ((select public.is_approved_admin()));
 end if;
end $$;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='admin_update_passenger_profiles') then
  create policy admin_update_passenger_profiles on public.profiles
   for update to authenticated
   using ((select public.is_approved_admin()) and role='passenger')
   with check ((select public.is_approved_admin()) and role='passenger');
 end if;
end $$;

-- Preserve protected identity fields; allow verified server operations and an
-- approved administrator to perform the status changes already exposed in Admin.
create or replace function public.proteger_datos_fast_trip()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.id is distinct from old.id or new.role is distinct from old.role
  or new.status is distinct from old.status or new.created_at is distinct from old.created_at then
  if session_user not in ('postgres','service_role')
   and coalesce(auth.jwt()->>'role','') <> 'service_role'
   and not (public.is_approved_admin() and new.role in ('driver','passenger') and new.id=old.id and new.role=old.role and new.created_at=old.created_at) then
   raise exception 'No está permitido modificar datos protegidos';
  end if;
 end if;
 return new;
end $$;
