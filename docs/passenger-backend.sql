-- Passenger features, additive to the existing FAST TRIP schema.
create table public.trip_cancellation_requests (
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null references public.trips(id),
 requester_id uuid not null references public.profiles(id),
 requester_role text not null check(requester_role in ('passenger','driver')),
 reason text not null check(char_length(reason) between 5 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 decided_by uuid references public.profiles(id)
);
alter table public.trip_cancellation_requests enable row level security;
create unique index trip_cancellation_one_pending on public.trip_cancellation_requests(trip_id) where status='pending';
create index trip_cancellation_requester on public.trip_cancellation_requests(requester_id);
grant select,insert on public.trip_cancellation_requests to authenticated;
grant update(status,decided_at,decided_by) on public.trip_cancellation_requests to authenticated;
create policy cancellation_participant_read on public.trip_cancellation_requests for select to authenticated
 using(requester_id=(select auth.uid()) or (select public.is_approved_admin()));
create policy cancellation_participant_insert on public.trip_cancellation_requests for insert to authenticated
 with check(requester_id=(select auth.uid()) and status='pending' and decided_at is null and decided_by is null and exists(
 select 1 from public.trips t where t.id=trip_id and t.status::text in ('pending','offered','accepted','in_progress') and
 ((requester_role='passenger' and t.passenger_id=(select auth.uid())) or (requester_role='driver' and t.driver_id=(select auth.uid())))
 ) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role::text=requester_role and p.status::text='approved'));
create policy cancellation_admin_update on public.trip_cancellation_requests for update to authenticated
 using((select public.is_approved_admin())) with check((select public.is_approved_admin()));
create function public.admin_decide_cancellation(p_request_id uuid,p_decision text) returns boolean
 language plpgsql security invoker set search_path='' as $$
declare r public.trip_cancellation_requests; s text;
begin
 if auth.uid() is null or not public.is_approved_admin() then raise exception 'Acceso administrativo requerido'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'Decisión inválida'; end if;
 select * into r from public.trip_cancellation_requests where id=p_request_id for update;
 if not found or r.status<>'pending' then return false; end if;
 select status::text into s from public.trips where id=r.trip_id for update;
 if p_decision='approved' then
  if s not in ('pending','offered','accepted','in_progress') then raise exception 'El viaje ya finalizó'; end if;
  update public.trips set status='cancelled',updated_at=now() where id=r.trip_id;
 end if;
 update public.trip_cancellation_requests set status=p_decision,decided_at=now(),decided_by=auth.uid() where id=r.id;
 return true;
end; $$;
revoke all on function public.admin_decide_cancellation(uuid,text) from public,anon;
grant execute on function public.admin_decide_cancellation(uuid,text) to authenticated;
create policy passenger_reads_trip_gps on public.trip_gps_points for select to authenticated
 using(exists(select 1 from public.trips t where t.id=trip_id and t.passenger_id=(select auth.uid()) and t.status::text in ('accepted','in_progress')));
create policy passenger_creates_emergency on public.security_incidents for insert to authenticated
 with check(incident_type='passenger_panic' and status='open' and char_length(description) between 1 and 1500 and exists(
 select 1 from public.trips t where t.id=trip_id and t.passenger_id=(select auth.uid()) and t.status::text in ('pending','offered','accepted','in_progress')));
grant insert on public.security_incidents to authenticated;
