export function outboxHandler(service,env,fetcher=fetch) {
 return async req=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const token=req.headers.get('x-worker-token')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return new Response('Unauthorized',{status:401});
  const auth=await service.rpc('whatsapp_worker_authorized',{p_token:token});
  if(auth.error||auth.data!==true)return new Response('Unauthorized',{status:401});
  const access=env('META_WHATSAPP_ACCESS_TOKEN');
  if(!access)return Response.json({error:'WhatsApp credential missing'},{status:503});
  const claim=await service.rpc('whatsapp_claim_outbox',{p_limit:10});
  if(claim.error)return Response.json({error:'Queue unavailable'},{status:503});
  const summary={sent:0,blocked:0,failed:0,uncertain:0};
  for(const row of claim.data||[]) {
   const update=async values=>{
    const result=await service.from('whatsapp_notification_outbox').update({...values,locked_at:null}).eq('id',row.id).eq('status','processing');
    if(result.error)throw Error('Queue update failed');
   };
   if(row.recipient_phone==='593963171259') {await update({status:'failed',last_error:'La alerta administrativa se consulta en el panel; no se envía desde Central a sí misma.'});summary.failed++;continue;}
   const text=String(row.template_parameters?.text||'').trim();
   if(!text||text.length>3500||!/^[1-9][0-9]{7,14}$/.test(row.recipient_phone)) {await update({status:'failed',last_error:'Contenido o teléfono no válido.'});summary.failed++;continue;}
   const recent=await service.from('whatsapp_incoming_messages').select('received_at').eq('sender_phone',row.recipient_phone).order('received_at',{ascending:false}).limit(1);
   if(recent.error){await update({status:'pending',available_at:new Date(Date.now()+60000).toISOString(),last_error:'No se pudo verificar la conversación.'});continue;}
   let useTemplate=Date.parse(recent.data?.[0]?.received_at||'')<Date.now()-23*3600000||!recent.data?.length;
   const send=async template=>{
    const payload={messaging_product:'whatsapp',recipient_type:'individual',to:row.recipient_phone,...(template?{type:'template',template:{name:'fast_trip_actualizacion',language:{code:'es'},components:[{type:'body',parameters:[{type:'text',text:text.replace(/\s+/g,' ')}]}]}}:{type:'text',text:{preview_url:false,body:text}})};
    const response=await fetcher('https://graph.facebook.com/v27.0/1346453718561081/messages',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    return {ok:response.ok,status:response.status,data:await response.json()};
   };
   try {
    let result=await send(useTemplate);
    if(!result.ok&&!useTemplate&&result.data?.error?.code===131047){useTemplate=true;result=await send(true);}
    if(result.ok&&typeof result.data.messages?.[0]?.id==='string') {await update({status:'sent',provider_message_id:result.data.messages[0].id,provider_status:'accepted',sent_at:new Date().toISOString(),last_error:null});summary.sent++;}
    else {
     const code=Number(result.data?.error?.code||result.status);
     if(useTemplate&&[132001,132005,132007,132012,132015,132016].includes(code)) {await update({status:'blocked',attempts:Math.max(0,row.attempts-1),available_at:new Date(Date.now()+15*60000).toISOString(),last_error:'Plantilla oficial pendiente o no disponible en Meta ('+code+'). Se conservará en cola.'});summary.blocked++;}
     else if([429,500,502,503,504,130429,131000,131048].includes(code)||result.status>=500) {await update({status:row.attempts>=8?'failed':'pending',available_at:new Date(Date.now()+Math.min(60,2**row.attempts)*60000).toISOString(),last_error:'Meta no aceptó el envío ('+code+').'});summary.failed++;}
     else {await update({status:'failed',last_error:'Meta rechazó el envío ('+code+'). Requiere revisión.'});summary.failed++;}
    }
   }catch {
    // A timeout can happen after Meta accepted a message. Never resend blindly.
    try{await update({status:'uncertain',last_error:'No se pudo confirmar la respuesta de Meta. Revisar antes de reenviar.'});}catch{}
    summary.uncertain++;
   }
  }
  return Response.json(summary);
 };
}
