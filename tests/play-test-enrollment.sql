begin;
do $test$
declare
  admin_id uuid := (select id from public.profiles where role='admin' and status='approved' limit 1);
  test_driver uuid := gen_random_uuid();
  test_passenger uuid := gen_random_uuid();
  driver_key uuid := gen_random_uuid();
  passenger_key uuid := gen_random_uuid();
  ride_id uuid := gen_random_uuid();
  denied boolean;
  invite uuid;
  new_invite uuid;
begin
  if admin_id is null then raise exception 'No administrator to run test'; end if;

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  select (public.manage_play_test('open')->>'invitation')::uuid into invite;
  if not public.play_test_invitation_open(invite) or public.play_test_is_open()
    or public.play_test_invitation_open(gen_random_uuid())
  then raise exception 'Invited and normal registration are not separated'; end if;

  insert into auth.users(id,email,raw_app_meta_data) values
    (test_driver,'play-test-' || driver_key::text || '@example.com','{"fast_trip_play_test":"driver"}'),
    (test_passenger,'play-test-' || passenger_key::text || '@example.com','{"fast_trip_play_test":"passenger"}');
  if public.reserve_play_test_invited_enrollment(driver_key,'driver','Conductor temporal',null,gen_random_uuid())
    or not public.reserve_play_test_invited_enrollment(driver_key,'driver','Conductor temporal',null,invite)
    or not public.reserve_play_test_invited_enrollment(passenger_key,'passenger','Pasajero temporal',null,invite)
    or not public.reserve_play_test_invited_enrollment(driver_key,'driver','Conductor temporal',null,invite)
    or public.reserve_play_test_invited_enrollment(driver_key,'driver','Nombre diferente',null,invite)
  then raise exception 'Enrollment reservation failed'; end if;
  if public.finish_play_test_enrollment(driver_key,test_passenger)
    or not public.finish_play_test_enrollment(driver_key,test_driver)
    or not public.finish_play_test_enrollment(driver_key,test_driver)
    or not public.finish_play_test_enrollment(passenger_key,test_passenger)
  then raise exception 'Enrollment finalization or retry failed'; end if;
  if (select count(*) from public.profiles where id in (test_driver,test_passenger) and status='approved' and phone is null) <> 2
    or not fasttrip_internal.is_review_user(test_driver) or not fasttrip_internal.is_review_user(test_passenger)
  then raise exception 'Enrollment must be approved immediately, isolated, and without a phone'; end if;

  perform set_config('request.jwt.claim.sub',test_driver::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_driver,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  denied := false;
  begin
    perform public.manage_play_test('close');
  exception when insufficient_privilege or raise_exception then
    denied := true;
  end;
  if not denied then raise exception 'Tester accessed admin controls'; end if;
  execute 'reset role';

  if not public.driver_has_active_payment(test_driver) or not exists (
    select 1 from public.vehicles where driver_id=test_driver and status='enabled' and unit_number='PRUEBA-' || driver_key::text
  ) then raise exception 'No test payment exemption or simulated vehicle'; end if;

  perform set_config('request.jwt.claim.sub',test_passenger::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_passenger,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.trips(id,passenger_id,origin_text,destination_text)
    values (ride_id,test_passenger,'Origen prueba','Destino prueba');
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',test_driver::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_driver,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if public.set_driver_availability(true) is distinct from true
    or public.accept_fast_trip(ride_id) is distinct from true then raise exception 'Driver could not accept test trip'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  perform public.manage_play_test('close');
  if public.play_test_invitation_open(invite)
    or exists (select from auth.users where id in (test_driver,test_passenger))
    or exists (select from public.profiles where id in (test_driver,test_passenger))
    or exists (select from public.vehicles where driver_id=test_driver)
    or exists (select from public.trips where id=ride_id)
    or exists (select from fasttrip_internal.play_test_enrollments where enrollment_key in (driver_key,passenger_key))
    or not exists (select from public.profiles where id=admin_id and role='admin' and status='approved')
  then raise exception 'Closing the test did not remove its data or preserve Administration'; end if;
  select (public.manage_play_test('open')->>'invitation')::uuid into new_invite;
  if new_invite=invite or public.play_test_invitation_open(invite) or not public.play_test_invitation_open(new_invite)
  then raise exception 'Reopening a test did not rotate the invitation'; end if;

end;
$test$;
select 'PLAY_TEST_DIRECT_ENTRY_OK' as result;
rollback;
