-- Runtime migration: queues, protected scheduling, guardian consent and scoped trip links.
create extension if not exists pg_net with schema extensions;

alter table public.whatsapp_notification_outbox drop constraint whatsapp_notification_outbox_status_check;
alter table public.whatsapp_notification_outbox add constraint whatsapp_notification_outbox_status_check check(status in ('pending','processing','sent','failed','blocked','uncertain','cancelled'));
alter table public.whatsapp_notification_outbox drop constraint whatsapp_notification_outbox_event_type_check;
alter table public.whatsapp_notification_outbox add constraint whatsapp_notification_outbox_event_type_check check(event_type in ('driver_approved','driver_rejected','passenger_approved','passenger_rejected','document_expiring','payment_due','trip_assigned','trip_arrival','trip_completed','cancellation_approved','cancellation_rejected','passenger_registration_pending','guardian_authorization_requested','guardian_trip_details','guardian_trip_completed'));
alter table public.whatsapp_notification_outbox add column if not exists available_at timestamptz not null default now(), add column if not exists locked_at timestamptz, add column if not exists dedupe_key text, add column if not exists provider_status text;
create unique index if not exists whatsapp_outbox_dedupe on public.whatsapp_notification_outbox(dedupe_key) where dedupe_key is not null;
create index if not exists whatsapp_outbox_pending on public.whatsapp_notification_outbox(status,available_at);
create table private.whatsapp_worker_config(id boolean primary key default true check(id), token_digest bytea not null);
alter table private.whatsapp_worker_config enable row level security;
revoke all on private.whatsapp_worker_config from public,anon,authenticated;
do $setup$ declare v text; begin
 v=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.whatsapp_worker_config(id,token_digest) values(true,extensions.digest(v,'sha256'));
 perform vault.create_secret(v,'fast_trip_whatsapp_worker','Scoped scheduler credential for WhatsApp queue dispatch only');
end $setup$;
create function public.whatsapp_worker_authorized(p_token text) returns boolean language sql security definer set search_path='' as $$
 select coalesce(length(p_token)=64 and exists(select 1 from private.whatsapp_worker_config where token_digest=extensions.digest(p_token,'sha256')),false);
$$;
revoke all on function public.whatsapp_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.whatsapp_worker_authorized(text) to service_role;
create function public.whatsapp_claim_outbox(p_limit integer default 10) returns setof public.whatsapp_notification_outbox language plpgsql security invoker set search_path='' as $$
begin
 update public.whatsapp_notification_outbox set status='uncertain',last_error='Proceso interrumpido; revisar antes de reenviar.' where status='processing' and locked_at<now()-interval '5 minutes';
 return query with pending as (select id from public.whatsapp_notification_outbox where status in ('pending','blocked') and available_at<=now() and attempts<8 order by created_at for update skip locked limit least(greatest(p_limit,1),20))
 update public.whatsapp_notification_outbox o set status='processing',locked_at=now(),attempts=o.attempts+1,last_error=null from pending where o.id=pending.id returning o.*;
end $$;
revoke all on function public.whatsapp_claim_outbox(integer) from public,anon,authenticated;
grant execute on function public.whatsapp_claim_outbox(integer) to service_role;

create or replace function private.queue_passenger_registration_alert() returns trigger language plpgsql security definer set search_path='' as $$ begin
 -- Administration receives the application through the existing authenticated panel;
 -- never attempt to send a WhatsApp message from Central to its own number.
 return new;
end $$;
create or replace function private.queue_passenger_review_alert() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient text; content text;
begin
 if new.status=old.status or new.status not in ('approved','rejected') then return new; end if;
 recipient=regexp_replace(new.phone,'[^0-9]','','g');
 if recipient ~ '^09[0-9]{8}$' then recipient='593'||substring(recipient from 2);end if;
 if recipient !~ '^[1-9][0-9]{7,14}$' then return new;end if;
 content=case when new.status='approved' then 'TU SOLICITUD FUE APROBADA. Abre FAST TRIP Pasajeros y revisa el correo para crear tu contraseña. Si ya tienes cuenta, inicia sesión. Google Play: https://play.google.com/apps/internaltest/4700388008868469701 — el enlace actual requiere una cuenta de pruebas autorizada.' else 'Tu solicitud de registro en FAST TRIP no ha sido aprobada por el momento. Comunícate con DARO para conocer las correcciones necesarias.' end;
 insert into public.whatsapp_notification_outbox(event_type,recipient_phone,template_name,template_parameters,dedupe_key)
 values('passenger_'||new.status,recipient,'fast_trip_actualizacion',jsonb_build_object('request_id',new.id,'text',content),'registration:'||new.id||':'||new.status) on conflict do nothing;
 return new;
end $$;

alter table public.passenger_registration_requests add column if not exists registration_kind text not null default 'adult' check(registration_kind in ('adult','adolescent')), add column if not exists guardian_name text, add column if not exists guardian_phone text, add column if not exists guardian_relationship text;
alter table public.passenger_registration_requests add constraint passenger_guardian_details check(registration_kind='adult' or (guardian_name is not null and guardian_phone is not null and guardian_relationship is not null and length(trim(guardian_name))>=5 and guardian_phone ~ '^[1-9][0-9]{7,14}$' and guardian_relationship in ('father','mother','guardian') and guardian_phone<>case when regexp_replace(phone,'[^0-9]','','g') ~ '^09[0-9]{8}$' then '593'||substring(regexp_replace(phone,'[^0-9]','','g') from 2) else regexp_replace(phone,'[^0-9]','','g') end));
drop policy passenger_registration_public_submit on public.passenger_registration_requests;
create policy passenger_registration_public_submit on public.passenger_registration_requests for insert to anon,authenticated with check(status='pending' and city='Guayaquil' and selfie_data_url is not null and terms_version='2026-11-11' and terms_accepted_at is not null and photo_approved_at is not null and terms_accepted_at<=now()+interval '5 minutes' and photo_approved_at<=now()+interval '5 minutes');
create table private.passenger_guardians(passenger_id uuid primary key references public.profiles(id),guardian_name text not null,guardian_phone text not null check(guardian_phone~'^[1-9][0-9]{7,14}$'),teen_phone text not null,relationship text not null check(relationship in ('father','mother','guardian')),verified_by uuid not null references public.profiles(id),verified_at timestamptz not null default now());
alter table private.passenger_guardians enable row level security;
revoke all on private.passenger_guardians from public,anon,authenticated;
create function public.set_verified_passenger_guardian(p_passenger_id uuid,p_registration_id uuid,p_reviewer uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.passenger_registration_requests%rowtype; n text;
begin
 if not exists(select 1 from public.profiles where id=p_reviewer and role='admin' and status='approved') then raise exception 'Solo Administración';end if;
 select * into r from public.passenger_registration_requests where id=p_registration_id and registration_kind='adolescent' and status='pending';
 if not found then raise exception 'Solicitud adolescente no válida';end if;
 n=regexp_replace(r.phone,'[^0-9]','','g');if n~'^09[0-9]{8}$' then n='593'||substring(n from 2);end if;
 if exists(select 1 from private.passenger_guardians where passenger_id=p_passenger_id and (guardian_phone<>r.guardian_phone or teen_phone<>n)) then raise exception 'El cambio de representante requiere revisión independiente';end if;
 insert into private.passenger_guardians(passenger_id,guardian_name,guardian_phone,teen_phone,relationship,verified_by) values(p_passenger_id,r.guardian_name,r.guardian_phone,n,r.guardian_relationship,p_reviewer) on conflict(passenger_id) do nothing;
 return true;
end $$;
revoke all on function public.set_verified_passenger_guardian(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_verified_passenger_guardian(uuid,uuid,uuid) to service_role;
create function public.passenger_guardian_status() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('is_adolescent',exists(select 1 from private.passenger_guardians where passenger_id=(select auth.uid())));
$$;
revoke all on function public.passenger_guardian_status() from public,anon;
grant execute on function public.passenger_guardian_status() to authenticated;

alter table public.adolescent_trip_requests add column if not exists authorization_expires_at timestamptz not null default now()+interval '2 hours', add column if not exists authorized_at timestamptz,add column if not exists authorization_message_id text,add column if not exists admin_verified_at timestamptz,add column if not exists admin_verified_by uuid references public.profiles(id),add column if not exists trip_id uuid unique,add column if not exists destination_lat double precision,add column if not exists destination_lng double precision,add column if not exists pickup_lat double precision,add column if not exists pickup_lng double precision,add column if not exists service_type text not null default 'local';
alter table public.trips add column if not exists adolescent_request_id uuid unique references public.adolescent_trip_requests(id);
alter table public.adolescent_trip_requests add constraint adolescent_created_trip foreign key(trip_id) references public.trips(id);
drop policy "teen request approved passenger insert" on public.adolescent_trip_requests;
revoke insert,update,delete on public.adolescent_trip_requests from anon,authenticated;
create function public.request_adolescent_trip(p_origin text,p_destination text,p_service text,p_destination_lat double precision,p_destination_lng double precision,p_pickup_lat double precision default null,p_pickup_lng double precision default null) returns uuid language plpgsql security definer set search_path='' as $$
declare g private.passenger_guardians%rowtype;r uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='passenger' and status='approved') then raise exception 'Cuenta pasajero aprobada requerida';end if;
 select * into g from private.passenger_guardians where passenger_id=auth.uid();if not found then raise exception 'Registro de representante pendiente de verificación';end if;
 if length(trim(p_origin))<5 or length(trim(p_destination))<5 or p_origin=p_destination or p_destination_lat not between -90 and 90 or p_destination_lng not between -180 and 180 or p_destination_lat is null or p_destination_lng is null then raise exception 'Revisa el origen y destino';end if;
 if p_service is null or p_service not in ('Transporte ejecutivo','Traslado al aeropuerto','Encomiendas','Viaje privado / turismo','Viaje por hora') then raise exception 'Servicio no válido';end if;
 if exists(select 1 from public.trips where passenger_id=auth.uid() and status in ('pending','offered','accepted','in_progress')) or exists(select 1 from public.adolescent_trip_requests where passenger_id=auth.uid() and status in ('awaiting_guardian','authorized') and authorization_expires_at>now()) then raise exception 'Ya existe una solicitud activa';end if;
 insert into public.adolescent_trip_requests(passenger_id,origin_text,destination_text,teen_phone,guardian_phone,destination_lat,destination_lng,pickup_lat,pickup_lng,service_type) values(auth.uid(),trim(p_origin),trim(p_destination),g.teen_phone,g.guardian_phone,p_destination_lat,p_destination_lng,p_pickup_lat,p_pickup_lng,p_service) returning id into r;
 insert into public.whatsapp_notification_outbox(event_type,recipient_phone,template_name,template_parameters,dedupe_key) values('guardian_authorization_requested',g.guardian_phone,'fast_trip_actualizacion',jsonb_build_object('request_id',r,'text','FAST TRIP: solicitud de traslado de adolescente. Origen: '||trim(p_origin)||'. Destino: '||trim(p_destination)||'. Para autorizar este viaje específico, revisa los términos para representantes (opción 5 y ACEPTO) y responde AUTORIZO '||r||'. Válido por 2 horas; Administración debe verificarlo antes de confirmar.'),'guardian-request:'||r);
 return r;
end $$;
revoke all on function public.request_adolescent_trip(text,text,text,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.request_adolescent_trip(text,text,text,double precision,double precision,double precision,double precision) to authenticated;
create function public.record_guardian_authorization(p_request_id uuid,p_sender_phone text,p_message_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.adolescent_trip_requests%rowtype;
begin
 select * into r from public.adolescent_trip_requests where id=p_request_id for update;
 if not found or r.guardian_phone<>p_sender_phone then return jsonb_build_object('ok',false,'message','No se encontró una solicitud para tu número de representante registrado.');end if;
 if not exists(select 1 from private.passenger_guardians g where g.passenger_id=r.passenger_id and g.guardian_phone=p_sender_phone) then return jsonb_build_object('ok',false,'message','El representante todavía no está verificado. Contacta a Administración.');end if;
 if not exists(select 1 from public.whatsapp_terms_acceptance where sender_phone=p_sender_phone and terms_version='2026-11-11-v3-guardian' and accepted_at is not null and declined_at is null) then return jsonb_build_object('ok',false,'message','Primero elige 5, lee los términos y responde ACEPTO. Después reenvía AUTORIZO con la referencia de este viaje.');end if;
 if r.authorization_expires_at<=now() or r.status not in ('awaiting_guardian','authorized') then return jsonb_build_object('ok',false,'message','Esta solicitud venció o ya se utilizó. Se necesita una nueva solicitud y autorización para cada viaje.');end if;
 if length(p_message_id)<5 then raise exception 'Falta evidencia del mensaje';end if;
 if not r.guardian_authorized then update public.adolescent_trip_requests set guardian_authorized=true,authorized_at=now(),authorization_message_id=p_message_id,status='authorized' where id=r.id;end if;
 return jsonb_build_object('ok',true,'message','Tu autorización para este viaje quedó registrada. Falta la verificación de Administración. Todavía no se ha asignado ni confirmado el traslado.');
end $$;
revoke all on function public.record_guardian_authorization(uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_guardian_authorization(uuid,text,text) to service_role;
create function public.admin_confirm_adolescent_trip(p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.adolescent_trip_requests%rowtype;t uuid;
begin
 if not public.is_approved_admin() then raise exception 'Solo Administración aprobada';end if;
 select * into r from public.adolescent_trip_requests where id=p_request_id for update;
 if not found or r.status<>'authorized' or not r.guardian_authorized or r.authorization_message_id is null or r.authorization_expires_at<=now() or r.trip_id is not null then raise exception 'Falta autorización vigente y verificable del representante';end if;
 if not exists(select 1 from private.passenger_guardians where passenger_id=r.passenger_id and guardian_phone=r.guardian_phone and teen_phone=r.teen_phone) then raise exception 'El vínculo del representante cambió; solicita nueva autorización';end if;
 if exists(select 1 from public.trips where passenger_id=r.passenger_id and status in ('pending','offered','accepted','in_progress')) then raise exception 'Ya existe viaje activo';end if;
 update public.adolescent_trip_requests set admin_verified_at=now(),admin_verified_by=auth.uid() where id=r.id;
 insert into public.trips(passenger_id,origin_text,destination_text,service_type,status,destination_lat,destination_lng,pickup_lat,pickup_lng,adolescent_request_id) values(r.passenger_id,r.origin_text,r.destination_text,r.service_type,'pending',r.destination_lat,r.destination_lng,r.pickup_lat,r.pickup_lng,r.id) returning id into t;
 update public.adolescent_trip_requests set trip_id=t,status='closed' where id=r.id;
 return t;
end $$;
revoke all on function public.admin_confirm_adolescent_trip(uuid) from public,anon;
grant execute on function public.admin_confirm_adolescent_trip(uuid) to authenticated;
create function private.require_adolescent_authorization() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.passenger_guardians where passenger_id=new.passenger_id) then
  if not exists(select 1 from public.adolescent_trip_requests r join private.passenger_guardians g on g.passenger_id=r.passenger_id where r.id=new.adolescent_request_id and r.passenger_id=new.passenger_id and r.guardian_phone=g.guardian_phone and r.guardian_authorized and r.authorization_message_id is not null and r.admin_verified_at is not null and r.authorization_expires_at>now() and r.trip_id is null and r.origin_text=new.origin_text and r.destination_text=new.destination_text) then raise exception 'El viaje del adolescente necesita autorización del representante y verificación administrativa';end if;
 elsif new.adolescent_request_id is not null then raise exception 'Referencia de adolescente no válida';end if;
 return new;
end $$;
revoke all on function private.require_adolescent_authorization() from public,anon,authenticated;
create trigger require_adolescent_authorization before insert on public.trips for each row execute function private.require_adolescent_authorization();

create table private.shared_trip_links(token_digest bytea primary key,trip_id uuid not null references public.trips(id),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours');
alter table private.shared_trip_links enable row level security;
revoke all on private.shared_trip_links from public,anon,authenticated;
create function private.issue_trip_share_link(p_trip_id uuid) returns text language plpgsql security definer set search_path='' as $$ declare token text;begin
 token=encode(extensions.gen_random_bytes(32),'hex');insert into private.shared_trip_links(token_digest,trip_id) values(extensions.digest(token,'sha256'),p_trip_id);
 return 'https://ricardo45530.github.io/fast-trip/seguimiento.html#token='||token;
end $$;
revoke all on function private.issue_trip_share_link(uuid) from public,anon,authenticated;
create function public.create_trip_share_link(p_trip_id uuid) returns text language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not exists(select 1 from public.trips where id=p_trip_id and passenger_id=auth.uid() and status in ('accepted','in_progress')) then raise exception 'Solo el pasajero del viaje activo puede compartirlo';end if;
 return private.issue_trip_share_link(p_trip_id);
end $$;
revoke all on function public.create_trip_share_link(uuid) from public,anon;
grant execute on function public.create_trip_share_link(uuid) to authenticated;
create function public.read_shared_trip(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.trips%rowtype;g record;d record;v record;
begin
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then return null;end if;
 select tr.* into t from private.shared_trip_links l join public.trips tr on tr.id=l.trip_id where l.token_digest=extensions.digest(p_token,'sha256') and l.expires_at>now() and (tr.status in ('accepted','in_progress') or (tr.status='completed' and tr.completed_at>now()-interval '15 minutes'));
 if not found then return null;end if;
 select latitude,longitude,recorded_at into g from public.trip_gps_points where trip_id=t.id order by recorded_at desc limit 1;
 select full_name into d from public.profiles where id=t.driver_id;
 select plate,make_model,unit_number into v from public.vehicles where (id=t.vehicle_id or (t.vehicle_id is null and driver_id=t.driver_id and status='enabled')) order by created_at desc limit 1;
 return jsonb_build_object('status',t.status,'origin',t.origin_text,'destination',t.destination_text,'driver',d.full_name,'plate',v.plate,'vehicle',v.make_model,'unit',v.unit_number,'latitude',case when t.status='completed' then null else g.latitude end,'longitude',case when t.status='completed' then null else g.longitude end,'recorded_at',g.recorded_at,'location_fresh',coalesce(g.recorded_at>now()-interval '2 minutes',false));
end $$;
revoke all on function public.read_shared_trip(text) from public;
grant execute on function public.read_shared_trip(text) to anon,authenticated,service_role;
create function private.queue_guardian_trip_updates() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.adolescent_trip_requests%rowtype;d text;v record;link text;content text;event text;
begin
 if new.adolescent_request_id is null then return new;end if;
 select * into r from public.adolescent_trip_requests where id=new.adolescent_request_id;
 if (new.status in ('accepted','in_progress') and new.driver_id is not null and (old.driver_id is distinct from new.driver_id or old.status not in ('accepted','in_progress'))) then
  select full_name into d from public.profiles where id=new.driver_id;
  select plate,make_model,unit_number into v from public.vehicles where (id=new.vehicle_id or (new.vehicle_id is null and driver_id=new.driver_id and status='enabled')) order by created_at desc limit 1;
  link=private.issue_trip_share_link(new.id);event='guardian_trip_details';content='FAST TRIP: conductor asignado al viaje autorizado. Conductor: '||coalesce(d,'Por confirmar')||'. Vehículo: '||coalesce(v.make_model,'Por confirmar')||'. Placa: '||coalesce(v.plate,'Por confirmar')||'. Unidad: '||coalesce(v.unit_number,'Por confirmar')||'. Seguimiento en tiempo real: '||link;
 elsif new.status='completed' and old.status is distinct from new.status then event='guardian_trip_completed';content='FAST TRIP: el traslado autorizado del adolescente ha finalizado. Referencia: '||new.id||'. Para asistencia, responde a DARO.';
 else return new;end if;
 insert into public.whatsapp_notification_outbox(event_type,recipient_phone,template_name,template_parameters,dedupe_key) values(event,r.guardian_phone,'fast_trip_actualizacion',jsonb_build_object('trip_id',new.id,'text',content),event||':'||new.id||':'||coalesce(new.driver_id::text,'')) on conflict do nothing;
 return new;
end $$;
revoke all on function private.queue_guardian_trip_updates() from public,anon,authenticated;
create trigger queue_guardian_trip_updates after update of status,driver_id on public.trips for each row execute function private.queue_guardian_trip_updates();
