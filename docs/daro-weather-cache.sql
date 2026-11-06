create table public.daro_weather_cache(key text primary key,data jsonb not null,expires_at timestamptz not null);
alter table public.daro_weather_cache enable row level security;
revoke all on public.daro_weather_cache from public,anon,authenticated;
grant all on public.daro_weather_cache to service_role;
