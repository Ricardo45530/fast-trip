-- Transaction-only security checks; these accounts are not enrolled as Play testers.
begin;
do $test$
declare rp uuid:=gen_random_uuid(); rd uuid:=gen_random_uuid(); np uuid:=gen_random_uuid(); nd uuid:=gen_random_uuid(); rt uuid:=gen_random_uuid(); nt uuid:=gen_random_uuid(); vehicle uuid:=gen_random_uuid(); nvehicle uuid:=gen_random_uuid(); visible integer; blocked boolean;
begin
 insert into auth.users(id,email) values(rp,rp||'@example.invalid'),(rd,rd||'@example.invalid'),(np,np||'@example.invalid'),(nd,nd||'@example.invalid');
 insert into public.profiles(id,full_name,role,status) values(rp,'Pasajero revisión temporal','passenger','pending'),(rd,'Conductor revisión temporal','driver','pending'),(np,'Pasajero normal temporal','passenger','pending'),(nd,'Conductor normal temporal','driver','pending');
 update public.profiles set status='approved' where id in(rp,rd,np,nd);
 insert into fasttrip_internal.app_review_users(user_id) values(rp),(rd);
 insert into public.driver_payment_exemptions(driver_id,reason) values(rd,'Rollback test'),(nd,'Rollback test');
 insert into public.vehicles(id,driver_id,plate,make_model,status,unit_number,model_year) values(vehicle,rd,'TEST-'||vehicle,'SUV de revisión temporal','enabled','TEST-'||vehicle,2026),(nvehicle,nd,'TEST-'||nvehicle,'SUV normal temporal','enabled','TEST-'||nvehicle,2026);
 insert into public.trips(id,passenger_id,origin_text,destination_text) values(rt,rp,'Origen revisión temporal','Destino revisión temporal'),(nt,np,'Origen normal temporal','Destino normal temporal');
 perform set_config('request.jwt.claim.sub',rd::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',rd,'role','authenticated')::text,true);execute 'set local role authenticated';
 perform public.set_driver_availability(true);
 select count(*) into visible from public.trips where id=nt;if visible<>0 then raise exception 'Review driver can see real trip';end if;
 select count(*) into visible from public.trips where id=rt;if visible<>1 then raise exception 'Review driver cannot see review trip';end if;
 blocked:=false;begin perform public.accept_fast_trip(nt);exception when others then blocked:=true;end;if not blocked then raise exception 'Review driver can accept real trip';end if;
 if public.accept_fast_trip(rt) is distinct from true then raise exception 'Review driver cannot accept review trip';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',nd::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',nd,'role','authenticated')::text,true);execute 'set local role authenticated';perform public.set_driver_availability(true);
 select count(*) into visible from public.trips where id=rt;if visible<>0 then raise exception 'Normal driver can see review trip';end if;
 if public.accept_fast_trip(nt) is distinct from true then raise exception 'Normal driver cannot accept normal trip';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{}',true);
 blocked:=false;begin update public.trips set driver_id=nd where id=rt;exception when others then blocked:=true;end;if not blocked then raise exception 'Cross-environment assignment allowed';end if;
end $test$;
select 'APP_REVIEW_ISOLATION_OK' as result;
rollback;
