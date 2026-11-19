-- Apply before enabling Google Places in production. Only coordinates from
-- Google Maps expire. Device GPS, original passenger text and trip records remain.
alter table public.trips
 add column pickup_google_expires_at timestamptz,
 add column destination_google_expires_at timestamptz;
alter table public.adolescent_trip_requests
 add column pickup_google_expires_at timestamptz,
 add column destination_google_expires_at timestamptz;

create function public.request_adolescent_trip_with_google(
 p_origin text, p_destination text, p_service text,
 p_destination_lat double precision, p_destination_lng double precision,
 p_pickup_lat double precision, p_pickup_lng double precision,
 p_google_pickup boolean, p_google_destination boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 -- This entry point delegates account, input and guardian checks to the existing RPC.
 request_id:=public.request_adolescent_trip(
  p_origin,p_destination,p_service,p_destination_lat,p_destination_lng,p_pickup_lat,p_pickup_lng
 );
 update public.adolescent_trip_requests
 set pickup_google_expires_at=case when p_google_pickup then now()+interval '28 days' end,
     destination_google_expires_at=case when p_google_destination then now()+interval '28 days' end
 where id=request_id and passenger_id=auth.uid();
 return request_id;
end $$;

revoke all on function public.request_adolescent_trip_with_google(
 text,text,text,double precision,double precision,double precision,double precision,boolean,boolean
) from public,anon;
grant execute on function public.request_adolescent_trip_with_google(
 text,text,text,double precision,double precision,double precision,double precision,boolean,boolean
) to authenticated;

create function private.set_trip_google_coordinate_expiry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.adolescent_request_id is not null then
  select r.pickup_google_expires_at,r.destination_google_expires_at
  into new.pickup_google_expires_at,new.destination_google_expires_at
  from public.adolescent_trip_requests r
  where r.id=new.adolescent_request_id and r.passenger_id=new.passenger_id;
 else
  if new.pickup_google_expires_at is not null then
   new.pickup_google_expires_at=now()+interval '28 days';
  end if;
  if new.destination_google_expires_at is not null then
   new.destination_google_expires_at=now()+interval '28 days';
  end if;
 end if;
 return new;
end $$;

revoke all on function private.set_trip_google_coordinate_expiry() from public,anon,authenticated;
create trigger set_trip_google_coordinate_expiry before insert on public.trips
for each row execute function private.set_trip_google_coordinate_expiry();

select cron.schedule('fasttrip-expire-google-coordinates','11 * * * *',$cleanup$
 update public.trips
 set pickup_lat=null,pickup_lng=null,pickup_google_expires_at=null
 where pickup_google_expires_at<=now();
 update public.trips
 set destination_lat=null,destination_lng=null,destination_google_expires_at=null
 where destination_google_expires_at<=now();
 update public.adolescent_trip_requests
 set pickup_lat=null,pickup_lng=null,pickup_google_expires_at=null
 where pickup_google_expires_at<=now();
 update public.adolescent_trip_requests
 set destination_lat=null,destination_lng=null,destination_google_expires_at=null
 where destination_google_expires_at<=now();
$cleanup$);
