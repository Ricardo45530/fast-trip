-- Keep boarding codes out of publicly readable trip rows and driver clients.
create table private.trip_boarding_pins (
 trip_id uuid primary key references public.trips(id) on delete cascade,
 pin text not null check(pin ~ '^[0-9]{6}$'),
 failures integer not null default 0,
 last_failure_at timestamptz
);
alter table private.trip_boarding_pins enable row level security;
revoke all on private.trip_boarding_pins from public,anon,authenticated;
create or replace function private.make_trip_boarding_pin() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.trip_boarding_pins(trip_id,pin) values(new.id,lpad((floor(random()*1000000)::int)::text,6,'0'));
 return new;
end $$;
revoke all on function private.make_trip_boarding_pin() from public,anon,authenticated;
create trigger make_trip_boarding_pin after insert on public.trips for each row execute function private.make_trip_boarding_pin();
insert into private.trip_boarding_pins(trip_id,pin) select id,lpad((floor(random()*1000000)::int)::text,6,'0') from public.trips where status::text in ('pending','offered','accepted','in_progress') on conflict do nothing;
create or replace function private.passenger_boarding_pin(p_trip_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare code text;
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 select p.pin into code from private.trip_boarding_pins p join public.trips t on t.id=p.trip_id where t.id=p_trip_id and t.passenger_id=auth.uid() and t.status::text='accepted';
 return code;
end $$;
create or replace function public.passenger_boarding_pin(p_trip_id uuid) returns text language sql security invoker set search_path='' as $$select private.passenger_boarding_pin(p_trip_id)$$;
create or replace function private.driver_trip_action(p_trip_id uuid,p_action text,p_pin text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.trips; code private.trip_boarding_pins;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='driver' and status='approved') then raise exception 'Acceso de conductor requerido';end if;
 select * into t from public.trips where id=p_trip_id and driver_id=auth.uid() for update;
 if not found then raise exception 'Viaje no asignado a este conductor';end if;
 if p_action='arrived' and t.status::text='accepted' then
  update public.trips set arrived_at=coalesce(arrived_at,now()),updated_at=now() where id=t.id;
 elsif p_action='start' and t.status::text='accepted' then
  select * into code from private.trip_boarding_pins where trip_id=t.id for update;
  if code.failures>=5 and code.last_failure_at>now()-interval '15 minutes' then return jsonb_build_object('ok',false,'message','Demasiados intentos. Contacta a Administración o espera 15 minutos.');end if;
  if code.pin is null or code.pin<>p_pin then
   update private.trip_boarding_pins set failures=case when last_failure_at<now()-interval '15 minutes' then 1 else failures+1 end,last_failure_at=now() where trip_id=t.id;
   return jsonb_build_object('ok',false,'message','PIN incorrecto. Solicítalo al pasajero antes de iniciar.');
  end if;
  update public.trips set status='in_progress',updated_at=now() where id=t.id;
 elsif p_action='complete' and t.status::text='in_progress' then
  update public.trips set status='completed',updated_at=now() where id=t.id;
 else return jsonb_build_object('ok',false,'message','La acción no corresponde al estado actual. Actualiza el viaje.');
 end if;
 return jsonb_build_object('ok',true,'message','Viaje actualizado.');
end $$;
create or replace function public.driver_trip_action(p_trip_id uuid,p_action text,p_pin text default '') returns jsonb language sql security invoker set search_path='' as $$select private.driver_trip_action(p_trip_id,p_action,p_pin)$$;
grant usage on schema private to authenticated;
revoke all on function private.passenger_boarding_pin(uuid),private.driver_trip_action(uuid,text,text),public.passenger_boarding_pin(uuid),public.driver_trip_action(uuid,text,text) from public,anon;
grant execute on function private.passenger_boarding_pin(uuid),private.driver_trip_action(uuid,text,text),public.passenger_boarding_pin(uuid),public.driver_trip_action(uuid,text,text) to authenticated;
