-- Transaction-only integration check. No rows, messages or trips persist.
begin;
do $test$
declare
 teen uuid:=gen_random_uuid(); reviewer uuid; registration uuid:=gen_random_uuid();
 request_id uuid; trip uuid; outcome jsonb; rejected boolean; driver uuid; expected_plate text;
begin
 select id into reviewer from public.profiles where role='admin' and status='approved' limit 1;
 if reviewer is null then raise exception 'No approved administrator available for validation';end if;
 insert into auth.users(id,email) values(teen,'integration-'||teen||'@example.invalid');
 insert into public.profiles(id,full_name,role,status) values(teen,'Integración temporal adolescente','passenger','pending');
 update public.profiles set status='approved' where id=teen;
 insert into public.passenger_registration_requests(id,full_name,national_id,phone,email,address,registration_kind,guardian_name,guardian_phone,guardian_relationship,guardian_registration_accepted_at)
 values(registration,'Integración temporal adolescente','SYNTHETIC','19999990001','integration-'||teen||'@example.invalid','Dirección temporal de integración','adolescent','Representante temporal','19999990002','mother',now());
 perform public.set_verified_passenger_guardian(teen,registration,reviewer);
 update public.passenger_registration_requests set status='approved',reviewed_by=reviewer,reviewed_at=now() where id=registration;
 if not exists(select 1 from public.whatsapp_notification_outbox where dedupe_key='registration:'||registration||':approved') then raise exception 'Missing registration approval notification';end if;
 perform set_config('request.jwt.claim.sub',teen::text,true);
 request_id:=public.request_adolescent_trip('Origen temporal integración','Destino temporal integración','Transporte ejecutivo',-2.19,-79.89,null,null);
 if not exists(select 1 from public.whatsapp_notification_outbox where dedupe_key='guardian-request:'||request_id) then raise exception 'Missing guardian request notification';end if;
 rejected:=false;
 begin
  insert into public.trips(passenger_id,origin_text,destination_text) values(teen,'Origen temporal integración','Destino temporal integración');
 exception when others then
  if sqlerrm not like '%necesita autorización%' then raise;end if;rejected:=true;
 end;
 if not rejected then raise exception 'Trip incorrectly allowed without guardian';end if;
 outcome:=public.record_guardian_authorization(request_id,'19999990003','synthetic-wrong-sender');
 if (outcome->>'ok')::boolean then raise exception 'Wrong representative accepted';end if;
 outcome:=public.record_guardian_authorization(request_id,'19999990002','synthetic-no-terms');
 if (outcome->>'ok')::boolean then raise exception 'Authorization accepted without terms';end if;
 insert into public.whatsapp_terms_acceptance(sender_phone,terms_version,accepted_at,accepted_message_id)
 values('19999990002','2026-11-11-v3-guardian',now(),'synthetic-acceptance')
 on conflict(sender_phone,terms_version) do update set accepted_at=now(),declined_at=null;
 outcome:=public.record_guardian_authorization(request_id,'19999990002','synthetic-valid-authorization');
 if not (outcome->>'ok')::boolean then raise exception 'Valid authorization refused: %',outcome;end if;
 perform set_config('request.jwt.claim.sub',reviewer::text,true);
 trip:=public.admin_confirm_adolescent_trip(request_id);
 if trip is null or not exists(select 1 from public.trips where id=trip and adolescent_request_id=request_id and status='pending') then raise exception 'Authorized trip was not created';end if;
 rejected:=false;
 begin perform public.admin_confirm_adolescent_trip(request_id);
 exception when others then if sqlerrm not like '%Falta autorización vigente%' then raise;end if;rejected:=true;end;
 if not rejected then raise exception 'Authorization reused';end if;
 select v.driver_id,v.plate into driver,expected_plate from public.vehicles v join public.profiles p on p.id=v.driver_id where v.status='enabled' and p.status='approved' limit 1;
 if driver is not null then
  update public.trips set driver_id=driver,status='accepted' where id=trip;
  if not exists(select 1 from public.whatsapp_notification_outbox where event_type='guardian_trip_details' and template_parameters->>'trip_id'=trip::text and template_parameters->>'text' like '%Placa:%' and template_parameters->>'text' like '%seguimiento.html#token=%') then raise exception 'Missing driver and tracking notification';end if;
 end if;
 update public.trips set status='completed' where id=trip;
 if not exists(select 1 from public.whatsapp_notification_outbox where event_type='guardian_trip_completed' and template_parameters->>'trip_id'=trip::text) then raise exception 'Missing completion notification';end if;
end;
$test$;
rollback;
select 'PASS: approval notification, guardian request, missing authorization blocked, wrong sender rejected, terms required, valid consent, administrative confirmation, reuse blocked, completion notification; all temporary changes rolled back' as integration_result;