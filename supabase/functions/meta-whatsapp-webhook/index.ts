// FAST TRIP: signed inbound WhatsApp messages and deterministic DARO replies.
export function replyFor(text) {
  const value = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const option = value.match(/^(?:opcion\s*)?([1-4])\s*[.)]?$/)?.[1];
  if (option === "2" || /conductor/.test(value)) return "Soy DARO, de FAST TRIP. Para solicitar tu registro como conductor, envía tu nombre completo y teléfono. La aprobación corresponde a Administración. Tu vehículo debe ser modelo 2022 en adelante. Te indicaremos los documentos y coordinaremos la cita.";
  if (option === "1" || /pasajero/.test(value)) return "¡Bienvenido a FAST TRIP Pasajeros!\n\nDescarga la app desde Google Play:\nhttps://play.google.com/apps/internaltest/4700388008868469701\n\nAbre la app, selecciona «Registrarme como pasajero» y completa tu solicitud. Administración debe aprobar tu registro antes de que puedas solicitar viajes.\n\nPor ahora, el enlace corresponde a pruebas internas y requiere una cuenta de Google autorizada. Si no te permite instalar, escríbenos para solicitar acceso.";
  if (option === "3" || /traslado|solicitar (?:un )?viaje/.test(value)) return "Para solicitar un traslado en FAST TRIP, primero debes registrarte como pasajero y recibir la aprobación de Administración.\n\nSi todavía no estás registrado, responde 1 para comenzar.\nSi tu registro está pendiente, espera la aprobación de Administración.\nSi ya estás registrado y aprobado, solicita tu traslado desde la app de Pasajeros.\n\nEste chat no confirma ni asigna traslados.";
  if (option === "4" || /reclamo|sugerencia/.test(value)) return "Soy DARO, de FAST TRIP. Escribe tu sugerencia o reclamo y la fecha del servicio. Tu mensaje quedará registrado para revisión de Administración.";
  return "Hola, soy DARO, la central de FAST TRIP. Lo hacemos diferente.\n¿En qué podemos ayudarte?\n\nOpción 1: Registrarme como pasajero\nOpción 2: Registrarme como conductor\nOpción 3: Solicitar un traslado\nOpción 4: Sugerencias y reclamos\n\nResponde con el número de la opción: 1, 2, 3 o 4.\nAtendemos Guayaquil y alrededores.";
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
          let result, data;
          try {
            result=await fetcher("https://graph.facebook.com/v27.0/"+phoneId+"/messages",{method:"POST",headers:{Authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:message.from,context:{message_id:message.id},type:"text",text:{preview_url:false,body:replyFor(text)}}),signal:AbortSignal.timeout(15000)});
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
