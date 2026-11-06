-- Passenger identity photos stay inside the admin-only registration rows.
alter table public.passenger_registration_requests
 add column if not exists selfie_data_url text,
 add column if not exists terms_version text,
 add column if not exists terms_accepted_at timestamptz,
 add column if not exists photo_approved_at timestamptz,
 add column if not exists request_key uuid not null default gen_random_uuid();
alter table public.passenger_registration_requests add column if not exists has_selfie boolean generated always as (selfie_data_url is not null) stored;
create unique index if not exists passenger_registration_request_key on public.passenger_registration_requests(request_key);
alter table public.passenger_registration_requests add constraint passenger_selfie_size check (selfie_data_url is null or (length(selfie_data_url) between 100 and 200000 and selfie_data_url ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/=]+$'));
grant insert(selfie_data_url,terms_version,terms_accepted_at,photo_approved_at,request_key) on public.passenger_registration_requests to anon;
alter policy passenger_registration_public_submit on public.passenger_registration_requests to anon with check (
 status='pending' and city='Guayaquil' and selfie_data_url is not null and terms_version='2026-11-05' and terms_accepted_at is not null and photo_approved_at is not null
 and terms_accepted_at<=now()+interval '5 minutes' and photo_approved_at<=now()+interval '5 minutes');

create table public.passenger_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 guide_accepted_at timestamptz,
 welcome_seen_at timestamptz,
 contact_1_name text not null default '' check(length(contact_1_name)<=100),
 contact_1_phone text not null default '' check(contact_1_phone='' or contact_1_phone ~ '^[1-9][0-9]{7,14}$'),
 contact_2_name text not null default '' check(length(contact_2_name)<=100),
 contact_2_phone text not null default '' check(contact_2_phone='' or contact_2_phone ~ '^[1-9][0-9]{7,14}$'),
 contact_3_name text not null default '' check(length(contact_3_name)<=100),
 contact_3_phone text not null default '' check(contact_3_phone='' or contact_3_phone ~ '^[1-9][0-9]{7,14}$'),
 voice_muted boolean not null default false
);
alter table public.passenger_preferences enable row level security;
grant select,insert,update on public.passenger_preferences to authenticated;
grant all on public.passenger_preferences to service_role;
create policy passenger_preferences_owner_read on public.passenger_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy passenger_preferences_owner_insert on public.passenger_preferences for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='passenger' and p.status='approved'));
create policy passenger_preferences_owner_update on public.passenger_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='passenger' and p.status='approved'));

alter table public.trips add column if not exists completed_at timestamptz,
 add column if not exists started_at timestamptz,
 add column if not exists arrived_at timestamptz,
 add column if not exists estimated_arrival_at timestamptz;
create schema if not exists private;
create or replace function private.stamp_passenger_trip_times() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.completed_at=null;new.started_at=null;new.arrived_at=null;
 else
  new.completed_at=old.completed_at;new.started_at=old.started_at;
  if new.status::text='in_progress' and old.status::text<>'in_progress' then new.started_at=now();end if;
  if new.status::text='completed' and old.status::text<>'completed' then new.completed_at=now();end if;
 end if;
 return new;
end $$;
revoke all on function private.stamp_passenger_trip_times() from public,anon,authenticated;
create trigger passenger_trip_times before insert or update on public.trips for each row execute function private.stamp_passenger_trip_times();

-- A committed registration creates an alert record atomically. It is never marked sent without a provider receipt.
alter table public.whatsapp_notification_outbox drop constraint whatsapp_notification_outbox_event_type_check;
alter table public.whatsapp_notification_outbox add constraint whatsapp_notification_outbox_event_type_check check(event_type in ('driver_approved','driver_rejected','passenger_approved','passenger_rejected','document_expiring','payment_due','trip_assigned','trip_arrival','trip_completed','cancellation_approved','cancellation_rejected','passenger_registration_pending'));
create or replace function private.queue_passenger_registration_alert() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.whatsapp_notification_outbox(event_type,recipient_phone,template_name,template_parameters,last_error)
 values('passenger_registration_pending','593963171259','passenger_registration_pending',jsonb_build_object('request_id',new.id,'text','Hay una nueva solicitud de pasajero. Revísala en Administración.'),'Pendiente de conectar el envío oficial de WhatsApp; este registro todavía NO se ha enviado.');
 return new;
end $$;
revoke all on function private.queue_passenger_registration_alert() from public,anon,authenticated;
create trigger queue_passenger_registration_alert after insert on public.passenger_registration_requests for each row execute function private.queue_passenger_registration_alert();
