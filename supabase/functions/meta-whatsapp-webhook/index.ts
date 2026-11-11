// FAST TRIP: signed inbound WhatsApp messages and deterministic DARO replies.
export function replyFor(text) {
  const value = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const option = value.match(/^(?:opcion\s*)?([1-5])\s*[.)]?$/)?.[1];
  if (option === "5" || /adolescente|representante|padre|madre|tutor/.test(value)) return "REGISTRO DE ADOLESCENTES · PADRES Y REPRESENTANTES\n\nEste registro debe gestionarse con el padre, madre o representante legal. Si eres adolescente, pide a tu representante que se comunique con DARO para acompañar tu registro.\n\nPara iniciar, el representante debe indicar:\n• Su nombre completo y si es padre, madre o representante legal.\n• Nombre completo del adolescente.\n• Teléfono del adolescente.\n• Teléfono de WhatsApp del representante.\n\nAdministración indicará cómo completar los datos y verificar la identidad y representación. El registro no se aprueba automáticamente.\n\nDescarga FAST TRIP Pasajeros desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\nEl enlace actual es de pruebas internas y requiere una cuenta de Google autorizada. Si no permite instalar, solicita acceso a DARO.\n\nPARA CADA VIAJE:\n1. El adolescente solicita el traslado, con origen y destino.\n2. El padre, madre o representante autoriza ESE viaje por WhatsApp desde su número registrado.\n3. Administración verifica esa autorización antes de confirmar. La aprobación administrativa no sustituye la autorización del representante.\n4. El representante debe recibir por WhatsApp el nombre del conductor, vehículo, placa y enlace GPS de seguimiento en tiempo real.\n\nLa aceptación de términos y el registro no autorizan viajes futuros: se necesita una autorización nueva para cada viaje. Este chat no confirma ni asigna el traslado.";
  if (option === "2" || /conductor/.test(value)) return "¡Bienvenido a FAST TRIP Conductor!\n\nDescarga la app desde Google Play:\nhttps://play.google.com/apps/internaltest/4701199062579262993\n\nPara solicitar tu registro como conductor, envía aquí tu nombre completo y teléfono. Administración te indicará los documentos y coordinará la cita para revisar tu registro y vehículo. Tu vehículo debe ser modelo 2024 en adelante. Cumplir el año no garantiza el ingreso: el Chevrolet Aveo no se admite y Administración indicará los demás modelos excluidos.\n\nDescargar la app no habilita tu cuenta: debes recibir la aprobación y habilitación de Administración antes de prestar servicios.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no puedes instalar, escríbenos para solicitar acceso.";
  if (option === "1" || /pasajero/.test(value)) return "¡Bienvenido a FAST TRIP Pasajeros!\n\nDescarga la app desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\n\nAbre la app, selecciona «Registrarme como pasajero» y completa nombres y apellidos, número de cédula escrito, teléfono, correo, dirección exacta y selfie o foto tipo carné. No necesitas enviar una foto de la cédula. Administración debe aprobar tu registro antes de que puedas solicitar viajes.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no puedes instalar, escríbenos para solicitar acceso.";
  if (option === "3" || /traslado|solicitar (?:un )?viaje/.test(value)) return "Para solicitar un traslado en FAST TRIP, primero debes registrarte como pasajero y recibir la aprobación de Administración.\n\nDescarga la app de Pasajeros desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\n\nSi todavía no estás registrado, abre la app, selecciona «Registrarme como pasajero» y completa tu solicitud. Si tu registro está pendiente, espera la aprobación de Administración.\n\nSi ya estás registrado y aprobado, solicita tu traslado desde la app de Pasajeros.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no puedes instalar, escríbenos para solicitar acceso.\n\nEste chat no confirma ni asigna traslados.";
  if (option === "4" || /reclamo|sugerencia/.test(value)) return "Soy DARO, de FAST TRIP. Escribe tu sugerencia o reclamo y la fecha del servicio. Tu mensaje quedará registrado para revisión de Administración.";
  return "Hola, soy DARO, la central de FAST TRIP. Lo hacemos diferente.\n¿En qué podemos ayudarte?\n\nOpción 1: Registrarme como pasajero\nOpción 2: Registrarme como conductor\nOpción 3: Solicitar un traslado\nOpción 4: Sugerencias y reclamos\nOpción 5: Registrar adolescente · Padre, madre o representante\n\nResponde con el número de la opción: 1, 2, 3, 4 o 5.\nAtendemos Guayaquil y alrededores.";
}
export const TERMS_VERSION = "2026-11-11-v3";
export const TERMS_BY_AUDIENCE = {"passenger":"TÉRMINOS Y CONDICIONES · PASAJEROS\nVersión 11/11/2026\n\n1. Registro\nCompleta nombres y apellidos, número de cédula escrito, teléfono, correo, dirección exacta y selfie o foto tipo carné. No se pide fotografía de la cédula. Revisa y autoriza tu selfie antes de enviarla. Administración debe aprobar tu solicitud antes de habilitar viajes; descargar la app y aceptar estos términos no aprueba una cuenta ni confirma una reserva.\n\n2. Seguimiento y viaje compartido\nEl viaje tiene seguimiento GPS en tiempo real. Desde la app puedes compartir el viaje con un familiar o amigo para que siga tu recorrido. Tú eliges con quién compartirlo.\n\n3. Seguridad\nAntes de abordar, verifica conductor, unidad y placa. Usa el cinturón y entrega el PIN cuando la app lo indique. No se permite fumar ni beber alcohol dentro del vehículo.\n\n4. Cancelaciones y cambios\nSolicita viajes que puedas realizar. No canceles unilateralmente: solicita la cancelación o el cambio y espera la decisión de Administración. El viaje sigue activo hasta que se confirme la cancelación.\n\n5. Tarifas locales\nPrimeros 2 km: $2,50; km adicional: $0,50. Espera: 5 minutos gratis; desde el minuto 6: $0,25/min. Los Ceibos, Entre Ríos, Vía a la Costa y Chongón: un solo recargo de $1,00. Horario nocturno, de 22:00 a 06:00: +$1,50. Encomiendas: +$1,00; carga: +$1,50; peajes: +$1,00 por cada paso. Servicios privados o por hora requieren cotización. Si una modificación de ruta es más corta, se mantiene el valor; si es más larga, se cobra el kilometraje adicional y debe coordinarse antes de continuar.\n\nPago y fidelidad: efectivo o tarjeta mediante PayPhone. El recargo por pago con tarjeta, cuando corresponda, se informa antes de pagar y no se aplica al efectivo. Después de 10 viajes pagados, el siguiente tiene 20% de descuento.\n\n6. Pertenencias\nRevisa tus pertenencias antes de bajar. FAST TRIP no se responsabiliza por objetos olvidados en la unidad, en la que viajan distintos usuarios. Si olvidas algo, contacta a DARO para coordinar la búsqueda. Este aviso no limita los derechos ni las obligaciones que correspondan conforme a la ley.\n\nDATOS PERSONALES\nUsamos los datos del registro y los mensajes para gestionar solicitudes, atención y seguridad. Guardamos la versión, el perfil, la fecha y la referencia del mensaje de aceptación. Privacidad y solicitudes sobre tus datos:\nhttps://ricardo45530.github.io/fast-trip/privacidad-central.html\n\nSi estás de acuerdo, responde únicamente: ACEPTO\nSi no estás de acuerdo, responde: NO ACEPTO\nPara elegir otro perfil, escribe CAMBIAR PERFIL.","driver":"TÉRMINOS Y CONDICIONES · CONDUCTORES\nVersión 11/11/2026\n\n1. Registro y habilitación\nDebes completar tu registro, presentar los documentos y llevar el vehículo a revisión. Administración debe aprobar y habilitar tu cuenta y unidad antes de prestar servicios. Descargar la app no equivale a aprobación. Solo se evalúan vehículos modelo 2024 en adelante, sujetos a las reglas de antigüedad de FAST TRIP. No todos los vehículos son admitidos, aunque cumplan el año requerido. El Chevrolet Aveo no se admite. Administración indicará los demás modelos excluidos y decidirá la admisión de cada unidad después de revisar el modelo, la documentación y la inspección del vehículo.\n\n2. Documentos a presentar\n• Currículum vitae.\n• Copias a color de cédula, licencia de conducir y papeleta de votación.\n• Matrícula vehicular vigente si eres propietario.\n• Si el vehículo es de alquiler o no eres propietario: autorización firmada del dueño y copia a color de su cédula. Toda unidad debe contar con matrícula vigente.\n• Planilla de un servicio básico donde conste el lugar de residencia del conductor.\n• Certificado de antecedentes penales obtenido desde la página oficial de Internet.\n• Dos recomendaciones personales firmadas por personas que no sean familiares ni vivan con el conductor.\n• Dos fotos tipo carné con camisa negra de vestir, no polo.\n• Cuenta bancaria para recibir los pagos correspondientes a viajes pagados por los clientes con tarjetas bancarias. Indica banco, titular, tipo y número de cuenta; Administración debe verificarla antes de utilizarla para pagos.\n\nDebes presentarte con el vehículo para la inspección presencial. Administración confirmará la fecha, hora y lugar, e indicará el canal para entregar la documentación y los datos bancarios.\nMantén los documentos vigentes y completa la verificación de identidad al iniciar la jornada. Los cambios de datos o unidad requieren revisión de Administración.\n\n3. GPS y seguimiento\nMantén el GPS activo mientras estés conectado, incluso durante llamadas o mensajes. El viaje tiene seguimiento en tiempo real y el pasajero puede compartirlo con un familiar o amigo.\n\n4. Servicio y seguridad\nVerifica el PIN de abordaje antes de iniciar el viaje. Respeta la ruta y coordina los cambios y paradas. No se permite fumar ni beber alcohol dentro del vehículo. No canceles unilateralmente: solicita la cancelación y espera la decisión de Administración.\n\n5. Cuotas\nEl ingreso es de $20. Desde el 1 de diciembre de 2026, la habilitación semanal es de $15 por 7 días desde la validación del pago: nuevos ingresos pagan $35 inicialmente ($20 + $15) y conductores existentes pagan $15 semanales. Hasta el 30 de noviembre se mantiene la exoneración semanal acordada. Las exoneraciones individuales deben estar validadas por Administración.\n\n6. Adolescentes\nNo inicies un traslado de adolescente sin la autorización del padre, madre o representante para ese viaje concreto y su verificación por Administración. La aceptación de estos términos no sustituye dicha autorización.\n\nDATOS PERSONALES\nUsamos los datos del registro y los mensajes para gestionar solicitudes, atención y seguridad. Guardamos la versión, el perfil, la fecha y la referencia del mensaje de aceptación. Privacidad y solicitudes sobre tus datos:\nhttps://ricardo45530.github.io/fast-trip/privacidad-central.html\n\nSi estás de acuerdo, responde únicamente: ACEPTO\nSi no estás de acuerdo, responde: NO ACEPTO\nPara elegir otro perfil, escribe CAMBIAR PERFIL.","guardian":"TÉRMINOS Y CONDICIONES · PADRES Y REPRESENTANTES DE ADOLESCENTES\nVersión 11/11/2026\n\n1. Registro\nCompleta nombres y apellidos, número de cédula escrito, teléfono, correo, dirección exacta y selfie o foto tipo carné. No se pide fotografía de la cédula. Revisa y autoriza tu selfie antes de enviarla. Administración debe aprobar tu solicitud antes de habilitar viajes; descargar la app y aceptar estos términos no aprueba una cuenta ni confirma una reserva.\n\n2. Seguimiento y viaje compartido\nEl viaje tiene seguimiento GPS en tiempo real. Desde la app puedes compartir el viaje con un familiar o amigo para que siga tu recorrido. Tú eliges con quién compartirlo.\n\n3. Seguridad\nAntes de abordar, verifica conductor, unidad y placa. Usa el cinturón y entrega el PIN cuando la app lo indique. No se permite fumar ni beber alcohol dentro del vehículo.\n\n4. Cancelaciones y cambios\nSolicita viajes que puedas realizar. No canceles unilateralmente: solicita la cancelación o el cambio y espera la decisión de Administración. El viaje sigue activo hasta que se confirme la cancelación.\n\n5. Tarifas locales\nPrimeros 2 km: $2,50; km adicional: $0,50. Espera: 5 minutos gratis; desde el minuto 6: $0,25/min. Los Ceibos, Entre Ríos, Vía a la Costa y Chongón: un solo recargo de $1,00. Horario nocturno, de 22:00 a 06:00: +$1,50. Encomiendas: +$1,00; carga: +$1,50; peajes: +$1,00 por cada paso. Servicios privados o por hora requieren cotización. Si una modificación de ruta es más corta, se mantiene el valor; si es más larga, se cobra el kilometraje adicional y debe coordinarse antes de continuar.\n\nPago y fidelidad: efectivo o tarjeta mediante PayPhone. El recargo por pago con tarjeta, cuando corresponda, se informa antes de pagar y no se aplica al efectivo. Después de 10 viajes pagados, el siguiente tiene 20% de descuento.\n\n6. Pertenencias\nRevisa tus pertenencias antes de bajar. FAST TRIP no se responsabiliza por objetos olvidados en la unidad, en la que viajan distintos usuarios. Si olvidas algo, contacta a DARO para coordinar la búsqueda. Este aviso no limita los derechos ni las obligaciones que correspondan conforme a la ley.\n\n7. Registro del adolescente\nEl registro se gestiona con el padre, madre o representante legal. Se identifican ambos y se registran el teléfono del adolescente y el WhatsApp del representante. Administración revisa la identidad y representación; el registro no se aprueba automáticamente.\n\n8. Autorización por CADA viaje\nEl adolescente solicita el traslado. El padre, madre o representante debe autorizar por WhatsApp ESE viaje concreto desde su número registrado. Administración verifica la autorización antes de confirmar; no puede sustituir al representante. Aceptar estos términos o registrar al adolescente no constituye autorización general ni autoriza viajes futuros.\n\n9. Información al representante\nPara cada viaje, el representante debe recibir por WhatsApp el nombre del conductor, vehículo, placa y enlace GPS de seguimiento en tiempo real.\n\nDATOS PERSONALES\nUsamos los datos del registro y los mensajes para gestionar solicitudes, atención y seguridad. Guardamos la versión, el perfil, la fecha y la referencia del mensaje de aceptación. Privacidad y solicitudes sobre tus datos:\nhttps://ricardo45530.github.io/fast-trip/privacidad-central.html\n\nSi estás de acuerdo, responde únicamente: ACEPTO\nSi no estás de acuerdo, responde: NO ACEPTO\nPara elegir otro perfil, escribe CAMBIAR PERFIL."};
export const AUDIENCE_PROMPT = "Hola, soy DARO, la central de FAST TRIP. Lo hacemos diferente.\n\nAntes de continuar, elige los términos y condiciones que corresponden a tu perfil:\n\n1: Pasajero\n2: Conductor\n5: Padre, madre o representante de un adolescente\n\nDespués de leerlos y responder ACEPTO, te mostraré las opciones de registro y servicio.";
export const normalizeReply = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function audienceFor(text) {
  const value=normalizeReply(text);
  const option=value.match(/^(?:opcion\s*)?([1-5])\s*[.)]?$/)?.[1];
  if(option==="5" || /adolescente|representante|padre|madre|tutor/.test(value)) return "guardian";
  if(option==="2" || /conductor/.test(value)) return "driver";
  if(option==="1" || option==="3" || /pasajero|traslado|solicitar (?:un )?viaje/.test(value)) return "passenger";
  return null;
}
export async function conversationReply(db, text, message) {
  const value=normalizeReply(text);
  const authorization=value.match(/^autorizo\s+([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/);
  if(authorization){
    const result=await db('rpc/record_guardian_authorization','POST',{p_request_id:authorization[1],p_sender_phone:message.from,p_message_id:message.id});
    return result.message||'No se pudo registrar la autorización. Contacta a Administración.';
  }
  if(/^(cambiar perfil|perfiles)$/.test(value)) return AUDIENCE_PROMPT;
  const phone=encodeURIComponent(message.from);
  const preferencePath="whatsapp_terms_audience?sender_phone=eq."+phone;
  const preferences=await db(preferencePath+"&select=audience","GET");
  const requested=audienceFor(text);
  const audience=requested || preferences[0]?.audience;
  if(!audience || !TERMS_BY_AUDIENCE[audience]) return AUDIENCE_PROMPT;
  if(requested && preferences[0]?.audience!==requested) {
    await db("whatsapp_terms_audience?on_conflict=sender_phone","POST",{sender_phone:message.from,audience:requested,updated_at:new Date().toISOString()},"resolution=merge-duplicates,return=representation");
  }
  const version=(audience==="driver" ? "2026-11-11-v5" : TERMS_VERSION)+"-"+audience;
  const path="whatsapp_terms_acceptance?sender_phone=eq."+phone+"&terms_version=eq."+version;
  const rows=await db(path+"&select=accepted_at,accepted_message_id,declined_at","GET");
  const terms=TERMS_BY_AUDIENCE[audience];
  const offer=async()=>db("whatsapp_terms_acceptance?on_conflict=sender_phone,terms_version","POST",{sender_phone:message.from,terms_version:version},"resolution=ignore-duplicates,return=representation");
  if(/^no acepto[.!]?$/.test(value)) {
    if(!rows.length) await offer();
    await db(path,"PATCH",{declined_at:new Date().toISOString()});
    return "Entendido. No continuaremos con el registro de este perfil sin tu aceptación. Para revisar sus condiciones, escribe TÉRMINOS. Para elegir otro perfil, escribe CAMBIAR PERFIL. Las consultas sobre tus datos o solicitudes existentes pueden dirigirse a Administración.";
  }
  if(!rows.length) {await offer();return terms;}
  if(/^(terminos|terminos y condiciones)( de| para)?( pasajeros?| conductores?| adolescentes?)?$/.test(value)) return terms;
  if(!rows[0].accepted_at || rows[0].declined_at) {
    if(!/^acepto[.!]?$/.test(value)) return terms;
    await db(path,"PATCH",{accepted_at:new Date().toISOString(),accepted_message_id:message.id,declined_at:null});
    const label={passenger:"pasajeros",driver:"conductores",guardian:"padres y representantes de adolescentes"}[audience];
    return "Gracias. Registramos tu aceptación de los términos para "+label+".\n\n"+replyFor("menu");
  }
  if(/^acepto[.!]?$/.test(value)) return replyFor("menu");
  return replyFor(text);
}

export function createHandler(env, fetcher = fetch) {
  return async (req) => {
    const url = new URL(req.url);
    if (req.method === "GET") {
      const token = env("META_WEBHOOK_VERIFY_TOKEN");
      if (!token) return new Response("Verification unavailable", {status:503});
      if (url.searchParams.get("hub.mode")==="subscribe" && url.searchParams.get("hub.verify_token")===token && url.searchParams.has("hub.challenge"))
        return new Response(url.searchParams.get("hub.challenge"), {headers:{"content-type":"text/plain"}});
      return new Response("Forbidden", {status:403});
    }
    if (req.method !== "POST") return new Response("Method not allowed",{status:405,headers:{allow:"GET, POST"}});
    const secret = env("META_APP_SECRET");
    if (!secret) return new Response("Webhook signature validation not configured",{status:503});
    if (Number(req.headers.get("content-length")||0)>1048576) return new Response("Too large",{status:413});
    const raw = new Uint8Array(await req.arrayBuffer());
    if(raw.length>1048576) return new Response("Too large",{status:413});
    const sig=req.headers.get("x-hub-signature-256")||"";
    if(!/^sha256=[a-f0-9]{64}$/i.test(sig)) return new Response("Invalid signature",{status:401});
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    const bytes=new Uint8Array(sig.slice(7).match(/../g).map(x=>parseInt(x,16)));
    if(!await crypto.subtle.verify("HMAC",key,bytes,raw)) return new Response("Invalid signature",{status:401});
    let payload;
    try {payload=JSON.parse(new TextDecoder().decode(raw));} catch {return new Response("Invalid JSON",{status:400});}
    if(payload.object!=="whatsapp_business_account") return new Response("Unsupported event",{status:400});
    const base=env("SUPABASE_URL"), dbkey=env("SUPABASE_SERVICE_ROLE_KEY");
    if(!base || !dbkey) return new Response("Database unavailable",{status:503});
    const db=async(path,method,body,prefer="return=representation")=>{
      const result=await fetcher(base+"/rest/v1/"+path,{method,headers:{apikey:dbkey,Authorization:"Bearer "+dbkey,"content-type":"application/json",Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body)});
      if(!result.ok) throw new Error("Database operation failed");
      return result.status===204?[]:await result.json();
    };
    try {
      for(const entry of payload.entry||[]) for(const change of entry.changes||[]) {
        if(change.field!=="messages") continue;
        const value=change.value||{};
        const displayed=String(value.metadata?.display_phone_number||"").replace(/\D/g,"");
        if(displayed!=="593963171259") continue;
        const phoneId=String(value.metadata?.phone_number_id||"");
        if(!/^\d+$/.test(phoneId)) continue;
        for(const receipt of value.statuses||[]) {
          if(typeof receipt.id==='string' && ['sent','delivered','read','failed'].includes(receipt.status))
            await db('rpc/record_whatsapp_delivery','POST',{p_message_id:receipt.id,p_status:receipt.status});
        }
        const messages=value.messages||[];
        const token=env("META_WHATSAPP_ACCESS_TOKEN");
        if(messages.length && !token) return new Response("WhatsApp sending token not configured",{status:503});
        for(const message of messages) {
          if(typeof message.id!=="string" || !/^\d{7,15}$/.test(message.from||"")) continue;
          const id=encodeURIComponent(message.id);
          const text=String(message.text?.body||message.button?.text||message.interactive?.button_reply?.title||message.interactive?.list_reply?.title||"").slice(0,4096);
          await db("whatsapp_incoming_messages?on_conflict=message_id","POST",{message_id:message.id,sender_phone:message.from,phone_number_id:phoneId,message_type:String(message.type||"unknown"),message_text:text},"resolution=ignore-duplicates,return=representation");
          // Atomic claim: duplicate webhook deliveries cannot send a second reply.
          const claimed=await db("whatsapp_incoming_messages?message_id=eq."+id+"&reply_state=eq.received","PATCH",{reply_state:"sending",updated_at:new Date().toISOString()});
          if(!claimed.length) continue;
          const timestamp=Number(message.timestamp);
          if(!Number.isFinite(timestamp) || Date.now()/1000-timestamp>23*3600 || timestamp>Date.now()/1000+300) {
            await db("whatsapp_incoming_messages?message_id=eq."+id,"PATCH",{reply_state:"ignored",provider_error_code:"outside_reply_window"});
            continue;
          }
          const responseText = await conversationReply(db, text, message);
          let result, data;
          try {
            result=await fetcher("https://graph.facebook.com/v27.0/"+phoneId+"/messages",{method:"POST",headers:{Authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:message.from,context:{message_id:message.id},type:"text",text:{preview_url:false,body:responseText}}),signal:AbortSignal.timeout(15000)});
            data=await result.json();
          } catch {
            // An ambiguous timeout must not cause duplicate messages on webhook retry.
            await db("whatsapp_incoming_messages?message_id=eq."+id,"PATCH",{reply_state:"uncertain",provider_error_code:"network_or_response_error"});
            continue;
          }
          const success=result.ok && typeof data.messages?.[0]?.id==="string";
          await db("whatsapp_incoming_messages?message_id=eq."+id,"PATCH",{reply_state:success?"sent":"failed",provider_reply_id:success?data.messages[0].id:null,provider_error_code:success?null:String(data.error?.code||result.status),updated_at:new Date().toISOString()});
        }
      }
      return Response.json({received:true});
    } catch {
      console.error("WhatsApp webhook processing failed");
      return new Response("Processing unavailable",{status:503});
    }
  };
}
if (typeof Deno!=="undefined") Deno.serve(createHandler(name=>Deno.env.get(name)));
