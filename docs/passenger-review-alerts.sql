alter table public.whatsapp_notification_outbox drop constraint whatsapp_notification_outbox_recipient_phone_check;
alter table public.whatsapp_notification_outbox add constraint whatsapp_notification_outbox_recipient_phone_check check(recipient_phone ~ '^[1-9][0-9]{7,14}$');
create or replace function private.queue_passenger_review_alert() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient text;
begin
 if new.status=old.status or new.status not in ('approved','rejected') then return new;end if;
 recipient=regexp_replace(new.phone,'[^0-9]','','g');
 if recipient ~ '^09[0-9]{8}$' then recipient='593'||substring(recipient from 2);end if;
 if recipient ~ '^[1-9][0-9]{7,14}$' then
  insert into public.whatsapp_notification_outbox(event_type,recipient_phone,template_name,template_parameters,last_error)
  values('passenger_'||new.status,recipient,'passenger_'||new.status,jsonb_build_object('request_id',new.id,'text',case when new.status='approved' then 'Tu cuenta FAST TRIP ha sido aprobada. Revisa tu correo para crear tu contraseña o ingresa a la app Pasajeros si ya tienes acceso.' else 'Administración revisó tu solicitud de pasajero. Comunícate con DARO para conocer las correcciones necesarias.' end),'Pendiente de conectar el envío oficial de WhatsApp; todavía NO enviado.');
 end if;
 return new;
end $$;
revoke all on function private.queue_passenger_review_alert() from public,anon,authenticated;
create trigger queue_passenger_review_alert after update of status on public.passenger_registration_requests for each row execute function private.queue_passenger_review_alert();
