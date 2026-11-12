-- Runs under each authenticated app role; rolls back all test rows.
begin;
do $test$
declare
 passenger uuid:=gen_random_uuid(); driver1 uuid:=gen_random_uuid(); driver2 uuid:=gen_random_uuid(); administrator uuid;
 vehicle1 uuid:=gen_random_uuid(); vehicle2 uuid:=gen_random_uuid(); trip uuid:=gen_random_uuid();
 pin text; result jsonb; ok boolean; count_rows integer;
begin
 select id into administrator from public.profiles where role='admin' and status='approved' limit 1;
 if administrator is null then raise exception 'Missing approved administrator';end if;
 insert into auth.users(id,email) values
 (passenger,'trip-integration-'||passenger||'@example.invalid'),
 (driver1,'trip-integration-'||driver1||'@example.invalid'),
 (driver2,'trip-integration-'||driver2||'@example.invalid');
 insert into public.profiles(id,full_name,role,status) values
 (passenger,'Pasajero temporal integración','passenger','pending'),
 (driver1,'Conductor temporal integración 1','driver','pending'),
 (driver2,'Conductor temporal integración 2','driver','pending');
 update public.profiles set status='approved' where id in(passenger,driver1,driver2);
 insert into public.driver_payment_exemptions(driver_id,reason) values(driver1,'Temporary rollback-only integration'),(driver2,'Temporary rollback-only integration');
 insert into public.vehicles(id,driver_id,plate,make_model,status,unit_number,model_year)
 values(vehicle1,driver1,'TEST-'||vehicle1,'Vehículo temporal','enabled','TEST-'||vehicle1,2026),
 (vehicle2,driver2,'TEST-'||vehicle2,'Vehículo temporal','enabled','TEST-'||vehicle2,2026);
 perform set_config('request.jwt.claim.sub',passenger::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',passenger,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.trips(id,passenger_id,origin_text,destination_text,service_type,status,destination_lat,destination_lng)
 values(trip,passenger,'Origen temporal de integración','Destino temporal de integración','Transporte ejecutivo','pending',-2.19,-79.89);
 select count(*) into count_rows from public.trips where id=trip;
 if count_rows<>1 then raise exception 'Passenger cannot see requested trip';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',administrator::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into count_rows from public.trips where id=trip;
 if count_rows<>1 then raise exception 'Admin cannot supervise requested trip';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',driver1::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',driver1,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if public.set_driver_availability(true) is distinct from true then raise exception 'Driver cannot connect';end if;
 select count(*) into count_rows from public.trips where id=trip and status='pending' and driver_id is null;
 if count_rows<>1 then raise exception 'Connected driver cannot see pending trip';end if;
 if public.accept_fast_trip(trip) is distinct from true then raise exception 'First driver could not accept';end if;
 result:=public.driver_trip_action(trip,'arrived','');
 if result->>'ok'<>'true' then raise exception 'Arrival failed';end if;
 result:=public.driver_trip_action(trip,'start','invalid');
 if result->>'ok'<>'false' then raise exception 'Invalid PIN was accepted';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',driver2::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',driver2,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 perform public.set_driver_availability(true);
 if public.accept_fast_trip(trip) is distinct from false then raise exception 'Second driver could steal trip';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',passenger::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',passenger,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 pin:=public.passenger_boarding_pin(trip);
 if pin is null or pin!~'^[0-9]{6}$' then raise exception 'Passenger cannot retrieve boarding PIN';end if;
 result:=public.passenger_trip_details(trip);
 if result->>'driver_name'<>'Conductor temporal integración 1' or result->>'plate'<>'TEST-'||vehicle1 then raise exception 'Passenger cannot see assigned driver and vehicle';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',driver1::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',driver1,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.driver_trip_action(trip,'start',pin);
 if result->>'ok'<>'true' then raise exception 'Valid PIN could not start trip';end if;
 insert into public.trip_gps_points(id,trip_id,driver_id,latitude,longitude,accuracy_m) overriding system value
 values(-floor(random()*1000000000000000)::bigint,trip,driver1,-2.189,-79.889,10);
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',passenger::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',passenger,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into count_rows from public.trip_gps_points where trip_id=trip;
 if count_rows<>1 then raise exception 'Passenger cannot see driver GPS';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',administrator::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into count_rows from public.trip_gps_points where trip_id=trip;
 if count_rows<>1 then raise exception 'Admin cannot supervise driver GPS';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',driver1::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',driver1,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.driver_trip_action(trip,'complete','');
 if result->>'ok'<>'true' then raise exception 'Driver cannot complete trip';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',passenger::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',passenger,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into count_rows from public.trips where id=trip and status='completed' and started_at is not null and completed_at is not null;
 if count_rows<>1 then raise exception 'Completed trip not visible to passenger';end if;
 execute 'reset role';
end;
$test$;
rollback;
select 'PASS: authenticated passenger request, admin supervision, connected driver visibility, first acceptance only, arrival, invalid PIN rejected, valid PIN starts, passenger driver details, driver GPS write, passenger and admin GPS read, completion visible; temporary data rolled back' as integration_result;