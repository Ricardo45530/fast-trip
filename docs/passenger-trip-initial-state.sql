create policy passenger_trip_initial_state on public.trips as restrictive for insert to authenticated
 with check(status='pending' and driver_id is null and vehicle_id is null and total_amount is null and base_amount is null and surcharge_amount is null and started_at is null and completed_at is null and arrived_at is null and estimated_arrival_at is null);
