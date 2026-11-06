create function public.claim_map_request(p_service text) returns boolean language sql security invoker set search_path='' as $$
 with slot as (insert into public.trip_route_cache(key,data,expires_at) values('quota:'||p_service,'{}'::jsonb,now()+interval '1.1 seconds') on conflict(key) do update set expires_at=excluded.expires_at where public.trip_route_cache.expires_at<=now() returning 1) select exists(select 1 from slot)
$$;
revoke all on function public.claim_map_request(text) from public,anon,authenticated;
grant execute on function public.claim_map_request(text) to service_role;
