-- Test profiles and simulated vehicles are created by the enrollment and review
-- functions. Test participants cannot enroll themselves in the regular fleet.
create policy play_test_profile_insert_guard on public.profiles
as restrictive for insert to authenticated
with check ((select auth.jwt())->'app_metadata'->>'fast_trip_play_test' is null);

create policy play_test_vehicle_insert_guard on public.vehicles
as restrictive for insert to authenticated
with check ((select auth.jwt())->'app_metadata'->>'fast_trip_play_test' is null);

create policy play_test_vehicle_update_guard on public.vehicles
as restrictive for update to authenticated
using ((select auth.jwt())->'app_metadata'->>'fast_trip_play_test' is null)
with check ((select auth.jwt())->'app_metadata'->>'fast_trip_play_test' is null);
