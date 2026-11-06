alter table public.trips add column if not exists eta_updated_at timestamptz;
create table public.trip_route_cache(key text primary key,data jsonb not null,expires_at timestamptz not null);
alter table public.trip_route_cache enable row level security;
revoke all on public.trip_route_cache from public,anon,authenticated;
grant all on public.trip_route_cache to service_role;
