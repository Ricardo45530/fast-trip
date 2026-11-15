-- Keep app-review trips separate from customer trips. No personal accounts are changed.
begin;
create schema if not exists fasttrip_internal;
create table if not exists fasttrip_internal.app_review_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 purpose text not null default 'Google Play app review',
 created_at timestamptz not null default now()
);
alter table fasttrip_internal.app_review_users enable row level security;
revoke all on fasttrip_internal.app_review_users from public, anon, authenticated;
create or replace function fasttrip_internal.is_review_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from fasttrip_internal.app_review_users where user_id=p_user_id) $$;
revoke all on function fasttrip_internal.is_review_user(uuid) from public;
grant usage on schema fasttrip_internal to authenticated;
grant execute on function fasttrip_internal.is_review_user(uuid) to authenticated;
create policy app_review_trip_isolation on public.trips as restrictive for select to authenticated
using (public.is_approved_admin() or fasttrip_internal.is_review_user((select auth.uid())) = fasttrip_internal.is_review_user(passenger_id));
create or replace function fasttrip_internal.guard_review_trip()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is not null and not public.is_approved_admin()
  and fasttrip_internal.is_review_user(auth.uid()) is distinct from fasttrip_internal.is_review_user(new.passenger_id) then
  raise exception 'Los viajes de revisión están separados de los servicios de clientes';
 end if;
 if new.driver_id is not null and fasttrip_internal.is_review_user(new.driver_id) is distinct from fasttrip_internal.is_review_user(new.passenger_id) then
  raise exception 'Una cuenta de revisión solo puede atender viajes de revisión';
 end if;
 return new;
end $$;
revoke all on function fasttrip_internal.guard_review_trip() from public, anon, authenticated;
create trigger guard_app_review_trip before insert or update on public.trips
for each row execute function fasttrip_internal.guard_review_trip();
commit;
