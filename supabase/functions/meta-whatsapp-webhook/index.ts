// FAST TRIP: signed inbound WhatsApp messages and deterministic DARO replies.
export function replyFor(text) {
  const value = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const option = value.match(/^(?:opcion\s*)?([1-5])\s*[.)]?$/)?.[1];
  if (option === "5" || /adolescente|representante|padre|madre|tutor/.test(value)) return "REGISTRO DE ADOLESCENTES · PADRES Y REPRESENTANTES\n\nEste registro debe gestionarse con el padre, madre o representante legal. Si eres adolescente, pide a tu representante que se comunique con DARO para acompañar tu registro.\n\nPara iniciar, el representante debe indicar:\n• Su nombre completo y si es padre, madre o representante legal.\n• Nombre completo del adolescente.\n• Teléfono del adolescente.\n• Teléfono de WhatsApp del representante.\n\nAdministración indicará cómo completar los datos y verificar la identidad y representación. El registro no se aprueba automáticamente.\n\nDescarga FAST TRIP Pasajeros desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\nEl enlace actual es de pruebas internas y requiere una cuenta de Google autorizada. Si no permite instalar, solicita acceso a DARO.\n\nPARA CADA VIAJE:\n1. El adolescente solicita el traslado, con origen y destino.\n2. El padre, madre o representante autoriza ESE viaje por WhatsApp desde su número registrado.\n3. Administración verifica esa autorización antes de confirmar. La aprobación administrativa no sustituye la autorización del representante.\n4. El representante debe recibir por WhatsApp el nombre del conductor, vehículo, placa y enlace GPS de seguimiento en tiempo real.\n\nLa aceptación de términos y el registro no autorizan viajes futuros: se necesita una autorización nueva para cada viaje. Este chat no confirma ni asigna el traslado.";
  if (option === "2" || /conductor/.test(value)) return "¡Bienvenido a FAST TRIP Conductor!\n\nDescarga la app desde Google Play:\nhttps://play.google.com/apps/internaltest/4701199062579262993\n\nPara solicitar tu registro como conductor, envía aquí tu nombre completo y teléfono. Administración te indicará los documentos y coordinará la cita para revisar tu registro y vehículo. Tu vehículo debe ser modelo 2022 en adelante.\n\nDescargar la app no habilita tu cuenta: debes recibir la aprobación y habilitación de Administración antes de prestar servicios.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no puedes instalar, escríbenos para solicitar acceso.";
  if (option === "1" || /pasajero/.test(value)) return "¡Bienvenido a FAST TRIP Pasajeros!\n\nDescarga la app desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\n\nAbre la app, selecciona «Registrarme como pasajero» y completa tu solicitud. Administración debe aprobar tu registro antes de que puedas solicitar viajes.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no puedes instalar, escríbenos para solicitar acceso.";
  if (option === "3" || /traslado|solicitar (?:un )?viaje/.test(value)) return "Para solicitar un traslado en FAST TRIP, primero debes registrarte como pasajero y recibir la aprobación de Administración.\n\nDescarga la app de Pasajeros desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\n\nSi todavía no estás registrado, abre la app, selecciona «Registrarme como pasajero» y completa tu solicitud. Si tu registro está pendiente, espera la aprobación de Administración.\n\nSi ya estás registrado y aprobado, solicita tu traslado desde la app de Pasajeros.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no puedes instalar, escríbenos para solicitar acceso.\n\nEste chat no confirma ni asigna traslados.";
  if (option === "4" || /reclamo|sugerencia/.test(value)) return "Soy DARO, de FAST TRIP. Escribe tu sugerencia o reclamo y la fecha del servicio. Tu mensaje quedará registrado para revisión de Administración.";
  return "Hola, soy DARO, la central de FAST TRIP. Lo hacemos diferente.\n¿En qué podemos ayudarte?\n\nOpción 1: Registrarme como pasajero\nOpción 2: Registrarme como conductor\nOpción 3: Solicitar un traslado\nOpción 4: Sugerencias y reclamos\nOpción 5: Registrar adolescente · Padre, madre o representante\n\nResponde con el número de la opción: 1, 2, 3, 4 o 5.\nAtendemos Guayaquil y alrededores.";
}
export const TERMS_VERSION = "2026-11-11-v1";
export const TERMS_TEXT = "Hola, soy DARO, la central de FAST TRIP. Lo hacemos diferente.\n\nTÉRMINOS Y CONDICIONES · Versión 11/11/2026\n\nAntes de mostrar las opciones de registro y servicio, lee lo siguiente:\n\n1. Registro y aprobación\nPasajeros y conductores deben completar su registro. Administración revisa la solicitud antes de habilitar el servicio. Descargar la app o aceptar estos términos no aprueba una cuenta ni confirma un traslado.\n\n2. Viajes y seguridad\nSolicita viajes que puedas realizar. Verifica conductor, unidad y placa antes de abordar, usa el cinturón y entrega el PIN cuando la app lo indique. No se permite fumar ni beber alcohol dentro del vehículo.\n\n3. Cancelaciones y cambios\nNo canceles unilateralmente un viaje. Solicita la cancelación o el cambio y espera la decisión de Administración; el viaje sigue activo hasta su confirmación.\n\n4. Tarifas\nServicio local: primeros 2 km $2,50; km adicional $0,50. Hay 5 minutos de espera gratuitos y luego $0,25/min. Pueden aplicarse los recargos de zona, horario nocturno, peajes y servicios adicionales informados para el viaje. Servicios privados o por hora requieren cotización.\n\n5. Conductores\nEl registro requiere revisión de documentos y vehículo, modelo 2022 en adelante. La cuenta debe estar aprobada y habilitada antes de prestar servicios.\n\n6. Adolescentes\nEl registro se gestiona con el padre, madre o representante legal, identificando al adolescente y al representante y registrando los teléfonos de ambos. El representante debe autorizar por WhatsApp CADA viaje concreto. Aceptar estos términos o el registro no constituye autorización general para viajar. Administración verifica la autorización antes de confirmar el traslado; no la sustituye. Para ese viaje, el representante debe recibir nombre del conductor, vehículo, placa y enlace GPS de seguimiento en tiempo real.\n\n7. Pertenencias\nAntes de bajar, revisa tus pertenencias. Si olvidas algo, contacta a DARO para coordinar la búsqueda. El aviso sobre objetos olvidados no limita los derechos ni las obligaciones que correspondan conforme a la ley.\n\n8. Datos personales\nUsamos los datos del registro y los mensajes para gestionar solicitudes, atención y seguridad. Guardamos la versión, fecha y referencia del mensaje con que aceptas estos términos. Consulta los usos de tus datos y cómo pedir su corrección o eliminación:\nhttps://ricardo45530.github.io/fast-trip/privacidad-central.html\n\nSi estás de acuerdo, responde únicamente: ACEPTO\nSi no estás de acuerdo, responde: NO ACEPTO\n\nLa autorización del representante para un adolescente se verifica por separado en cada viaje.";
export const normalizeReply = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export async function conversationReply(db, text, message) {
  const value = normalizeReply(text);
  const path = "whatsapp_terms_acceptance?sender_phone=eq." + encodeURIComponent(message.from) + "&terms_version=eq." + TERMS_VERSION;
  const rows = await db(path + "&select=accepted_at,accepted_message_id,declined_at", "GET");
  if (/^no acepto[.!]?$/.test(value)) {
    if (!rows.length) await db("whatsapp_terms_acceptance?on_conflict=sender_phone,terms_version", "POST", {sender_phone:message.from,terms_version:TERMS_VERSION}, "resolution=ignore-duplicates,return=representation");
    await db(path, "PATCH", {declined_at:new Date().toISOString()});
    return "Entendido. No continuaremos con tu registro por este chat sin tu aceptación. Si quieres revisar los términos, escribe TÉRMINOS. Para consultas sobre tus datos o una solicitud ya existente, puedes escribirnos aquí para atención de Administración.";
  }
  if (/^(terminos|terminos y condiciones)$/.test(value)) return TERMS_TEXT;
  if (!rows.length) {
    await db("whatsapp_terms_acceptance?on_conflict=sender_phone,terms_version", "POST", {sender_phone:message.from,terms_version:TERMS_VERSION}, "resolution=ignore-duplicates,return=representation");
    return TERMS_TEXT;
  }
  if (!rows[0].accepted_at || rows[0].declined_at) {
    if (!/^acepto[.!]?$/.test(value)) return TERMS_TEXT;
    await db(path, "PATCH", {accepted_at:new Date().toISOString(),accepted_message_id:message.id,declined_at:null});
    return "Gracias. Registramos tu aceptación de los términos y condiciones.\n\n" + replyFor("menu");
  }
  if (/^acepto[.!]?$/.test(value)) return replyFor("menu");
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
