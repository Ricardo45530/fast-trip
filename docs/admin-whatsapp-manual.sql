begin;

alter table public.whatsapp_notification_outbox
  drop constraint whatsapp_notification_outbox_event_type_check;
alter table public.whatsapp_notification_outbox
  add constraint whatsapp_notification_outbox_event_type_check check (event_type in (
    'driver_approved','driver_rejected','passenger_approved','passenger_rejected','document_expiring',
    'payment_due','trip_assigned','trip_arrival','trip_completed','cancellation_approved',
    'cancellation_rejected','passenger_registration_pending','guardian_authorization_requested',
    'guardian_trip_details','guardian_trip_completed','admin_manual'
  ));

create or replace function public.admin_queue_whatsapp(p_phone text,p_text text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  phone text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  body text := btrim(coalesce(p_text,''));
  request_key text := 'admin-manual:' || auth.uid()::text || ':' || p_request_id::text;
  message_id uuid;
begin
  if not coalesce(public.is_approved_admin(),false) then
    raise exception 'Solo Administración puede enviar mensajes' using errcode='42501';
  end if;
  if phone ~ '^0[0-9]{9}$' then phone := '593' || substring(phone from 2); end if;
  if phone !~ '^[1-9][0-9]{9,14}$' or phone='593963171259' then
    raise exception 'Escribe un número de WhatsApp válido y distinto al de la Central.';
  end if;
  if char_length(body) not between 1 and 3500 or p_request_id is null then
    raise exception 'Escribe un mensaje de hasta 3500 caracteres.';
  end if;

  select id into message_id from public.whatsapp_notification_outbox
  where dedupe_key=request_key;
  if found then return message_id; end if;

  if not exists (
    select from public.whatsapp_incoming_messages
    where sender_phone=phone and received_at >= now()-interval '23 hours'
  ) then
    raise exception 'El destinatario debe escribir primero al WhatsApp de FAST TRIP para habilitar un mensaje manual.';
  end if;

  insert into public.whatsapp_notification_outbox(event_type,recipient_phone,template_name,template_parameters,dedupe_key)
  values('admin_manual',phone,'fast_trip_actualizacion',jsonb_build_object('text',body),request_key)
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into message_id;
  if message_id is null then
    select id into message_id from public.whatsapp_notification_outbox where dedupe_key=request_key;
  end if;
  return message_id;
end
$$;

revoke all on function public.admin_queue_whatsapp(text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_queue_whatsapp(text,text,uuid) to authenticated;

commit;
