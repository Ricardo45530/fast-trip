create or replace function public.read_shared_trip(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.trips%rowtype;g record;d record;v record;
begin
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then return null;end if;
 select tr.* into t from private.shared_trip_links l join public.trips tr on tr.id=l.trip_id where l.token_digest=extensions.digest(p_token,'sha256') and l.expires_at>now() and (tr.status in ('accepted','in_progress') or (tr.status='completed' and tr.completed_at>now()-interval '15 minutes'));
 if not found then return null;end if;
 select latitude,longitude,recorded_at into g from public.trip_gps_points where trip_id=t.id order by recorded_at desc limit 1;
 select full_name into d from public.profiles where id=t.driver_id;
 select plate,make_model,unit_number into v from public.vehicles where (id=t.vehicle_id or (t.vehicle_id is null and driver_id=t.driver_id and status='enabled')) order by created_at desc limit 1;
 return jsonb_build_object('status',t.status,'origin',t.origin_text,'destination',t.destination_text,'driver',d.full_name,'plate',v.plate,'vehicle',v.make_model,'unit',v.unit_number,'latitude',case when t.status='completed' then null else g.latitude end,'longitude',case when t.status='completed' then null else g.longitude end,'pickup_lat',case when t.status='accepted' and t.pickup_google_expires_at is null then t.pickup_lat end,
 'pickup_lng',case when t.status='accepted' and t.pickup_google_expires_at is null then t.pickup_lng end,
 'destination_lat',case when t.status in ('accepted','in_progress') and t.destination_google_expires_at is null then t.destination_lat end,
 'destination_lng',case when t.status in ('accepted','in_progress') and t.destination_google_expires_at is null then t.destination_lng end,
 'recorded_at',g.recorded_at,'location_fresh',coalesce(g.recorded_at>now()-interval '2 minutes',false));
end $$;
revoke all on function public.read_shared_trip(text) from public;
grant execute on function public.read_shared_trip(text) to anon,authenticated,service_role;
