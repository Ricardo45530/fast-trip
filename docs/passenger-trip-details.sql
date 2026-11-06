create or replace function private.passenger_trip_details(p_trip_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare info jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='passenger' and status='approved') then raise exception 'Acceso de pasajero requerido';end if;
 select jsonb_build_object('driver_name',p.full_name,'unit_number',v.unit_number,'plate',v.plate) into info from public.trips t left join public.profiles p on p.id=t.driver_id left join public.vehicles v on v.id=t.vehicle_id where t.id=p_trip_id and t.passenger_id=auth.uid() and t.status::text in ('accepted','in_progress','completed');return info;
end $$;
create or replace function public.passenger_trip_details(p_trip_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.passenger_trip_details(p_trip_id)$$;
revoke all on function private.passenger_trip_details(uuid),public.passenger_trip_details(uuid) from public,anon;
grant execute on function private.passenger_trip_details(uuid),public.passenger_trip_details(uuid) to authenticated;
