'use strict';
const passengerFlow=(()=>{
 const el=id=>document.getElementById(id);
 let stream=null,selfie='',photoConsent=null,preferences=null,preferencesUser=null,sessionStarted=0,expiryTimer=null,latestNotice=null,weather=null,weatherLoaded=0,weatherAudioUrl=null,destinationPoint=null; 
 let screenLightEnabled=true,capturing=false;
 const screenLight=document.createElement('div');screenLight.id='selfieScreenLight';screenLight.hidden=true;screenLight.setAttribute('aria-hidden','true');screenLight.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#fff;pointer-events:none';document.body.append(screenLight);
 const lightToggle=document.createElement('button');lightToggle.id='selfieLightToggle';lightToggle.type='button';lightToggle.className='outline';lightToggle.textContent='Luz para selfie: activada';lightToggle.setAttribute('aria-pressed','true');el('takePhoto').after(lightToggle);
 lightToggle.onclick=()=>{screenLightEnabled=!screenLightEnabled;lightToggle.setAttribute('aria-pressed',String(screenLightEnabled));lightToggle.textContent='Luz para selfie: '+(screenLightEnabled?'activada':'desactivada');};
 const playedAudio=new Audio();
 const storage={get(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
 const phone=value=>{let n=String(value||'').replace(/[\s()+.-]/g,'');if(/^09\d{8}$/.test(n))n='593'+n.slice(1);if(!/^[1-9]\d{7,14}$/.test(n))throw new Error('Revisa los números. Usa 09xxxxxxxx para Ecuador o el código de país para otros destinos.');return n;};
 function stopCamera(){screenLight.hidden=true;if(stream)for(const track of stream.getTracks())track.stop();stream=null;el('selfieCamera').srcObject=null;el('selfieCamera').classList.add('hidden');}
 async function takePhoto(){
  if(capturing)return;
  if(stream){
   const video=el('selfieCamera');if(!video.videoWidth){message('selfieStatus','La cámara todavía se está preparando. Intenta capturar de nuevo.');return;}
   capturing=true;el('takePhoto').disabled=true;lightToggle.disabled=true;const captureStream=stream;
   try{
   if(screenLightEnabled){screenLight.hidden=false;message('selfieStatus','Iluminando el rostro…');await new Promise(resolve=>setTimeout(resolve,450));}
   if(stream!==captureStream||!video.videoWidth)return;
   const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   let quality=.85;do{selfie=canvas.toDataURL('image/jpeg',quality);quality-=.1;}while(selfie.length>200000&&quality>.3);
   stopCamera();if(selfie.length>200000){selfie='';message('selfieStatus','La foto es demasiado grande. Vuelve a tomarla.');return;}
   photoConsent=null;el('selfiePreview').src=selfie;el('selfiePreview').classList.remove('hidden');el('approvePhoto').classList.remove('hidden');el('approvePhoto').disabled=false;el('approvePhoto').setAttribute('aria-pressed','false');el('approvePhoto').textContent='¿Apruebas enviar esta foto?';el('takePhoto').textContent='Volver a tomar foto';el('registrationSubmit').disabled=true;message('selfieStatus','Revisa la selfie. Todavía no se ha enviado.');return;
   }catch(e){selfie='';photoConsent=null;stopCamera();el('registrationSubmit').disabled=true;message('selfieStatus','No se pudo capturar la selfie. Vuelve a tomarla.');}
   finally{screenLight.hidden=true;capturing=false;el('takePhoto').disabled=false;lightToggle.disabled=false;}
   return;
  }
  if(!navigator.mediaDevices?.getUserMedia){message('selfieStatus','Esta versión no permite abrir la cámara. Actualiza la app o abre el registro en tu navegador.');el('cameraBrowserFallback').classList.remove('hidden');return;}
  el('takePhoto').disabled=true;message('selfieStatus','Solicitando acceso a la cámara frontal…');
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:960}},audio:false});selfie='';photoConsent=null;el('selfiePreview').classList.add('hidden');el('approvePhoto').classList.add('hidden');el('registrationSubmit').disabled=true;el('selfieCamera').classList.remove('hidden');el('selfieCamera').srcObject=stream;await el('selfieCamera').play();el('takePhoto').textContent='Capturar selfie';message('selfieStatus','Mira a la cámara y pulsa «Capturar selfie».');}catch(e){stopCamera();message('selfieStatus','No se pudo abrir la cámara. Revisa el permiso o actualiza la app. También puedes abrir este registro en tu navegador.');el('cameraBrowserFallback').classList.remove('hidden');}finally{el('takePhoto').disabled=false;}
 }
 el('takePhoto').onclick=takePhoto;
 el('approvePhoto').onclick=()=>{if(!selfie)return;photoConsent=new Date().toISOString();el('approvePhoto').setAttribute('aria-pressed','true');el('approvePhoto').textContent='Foto aprobada para enviar ✓';el('approvePhoto').disabled=true;el('registrationSubmit').disabled=false;message('selfieStatus','Foto aprobada. Se adjuntará cuando envíes tu solicitud.');};
 const registrationKind=el('registrationKind');
 registrationKind.onchange=()=>{
  const teen=registrationKind.value==='adolescent';el('guardianRegistration').classList.toggle('hidden',!teen);
  for(const id of ['guardianName','guardianPhone','guardianRegistrationConsent'])el(id).required=teen;
 };
 async function submitRegistration(event){
  event.preventDefault();const form=event.currentTarget;if(!client)return message('registrationMessage','No se pudo conectar. Intenta nuevamente.');
  if(!selfie||!photoConsent)return message('registrationMessage','Toma tu selfie y aprueba su envío antes de continuar.');
  const consent=passengerExperience.termsReceipt();if(!consent.acceptedAt){screen('terms');return;}
  const btn=el('registrationSubmit');btn.disabled=true;
  try{
   const f=new FormData(form),payload={};for(const k of ['full_name','national_id','phone','email','address'])payload[k]=String(f.get(k)||'').trim();
   if(payload.full_name.split(/\s+/).length<2)throw new Error('Escribe tus nombres y apellidos completos.');
   payload.phone=phone(payload.phone);payload.registration_kind=el('registrationKind').value;
   if(payload.registration_kind==='adolescent'){
    payload.guardian_name=el('guardianName').value.trim();payload.guardian_phone=phone(el('guardianPhone').value);payload.guardian_relationship=el('guardianRelationship').value;
    if(payload.guardian_name.split(/\s+/).length<2||!el('guardianRegistrationConsent').checked)throw new Error('El representante debe completar sus datos y aceptar gestionar el registro.');
    if(payload.guardian_phone===payload.phone)throw new Error('Registra el WhatsApp del representante y el teléfono del adolescente por separado.');
    payload.guardian_registration_accepted_at=new Date().toISOString();
   }
   payload.email=payload.email.toLowerCase();payload.city='Guayaquil';payload.selfie_data_url=selfie;payload.terms_version=consent.version;payload.terms_accepted_at=consent.acceptedAt;payload.photo_approved_at=photoConsent;
   // Retry the same in-memory submission with the same key, rather than creating duplicates.
   const signature=JSON.stringify(payload);if(submitRegistration.signature!==signature){submitRegistration.key=crypto.randomUUID();submitRegistration.signature=signature;}payload.request_key=submitRegistration.key;
   const submissionClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:'fasttrip.registration.anon',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   const result=await submissionClient.from('passenger_registration_requests').insert(payload);
   if(result.error&&result.error.code!=='23505')throw result.error;
   form.reset();registrationKind.onchange();selfie='';photoConsent=null;stopCamera();el('selfiePreview').removeAttribute('src');el('selfiePreview').classList.add('hidden');el('approvePhoto').classList.add('hidden');el('takePhoto').textContent='Tomar foto';
   message('registrationMessage','Tu solicitud ha sido enviada a nuestra Administración para su revisión. Recibirás el correo de acceso después de la aprobación y se registrará un aviso por WhatsApp. El registro del adolescente requiere verificar también al representante.');
   submitRegistration.signature=null;submitRegistration.key=null;
  }catch(e){message('registrationMessage',e.code?errorText(e):(e.message||errorText(e)));}finally{btn.disabled=!photoConsent;}
 }
 function contactPayload(prefix){const result={},numbers=[];for(let i=1;i<=3;i++){result['contact_'+i+'_name']=el(prefix+i+'Name').value.trim();const n=phone(el(prefix+i+'Phone').value);if(numbers.includes(n))throw new Error('Registra tres números de contacto diferentes.');numbers.push(n);result['contact_'+i+'_phone']=n;}return result;}
 function fillContacts(prefix){for(let i=1;i<=3;i++){el(prefix+i+'Name').value=preferences?.['contact_'+i+'_name']||'';el(prefix+i+'Phone').value=preferences?.['contact_'+i+'_phone']||'';}}
 async function savePreferences(values){if(!currentUser)throw new Error('Vuelve a iniciar sesión.');const r=await client.from('passenger_preferences').upsert({user_id:currentUser.id,...values},{onConflict:'user_id'});if(r.error)throw r.error;preferences={...preferences,...values,user_id:currentUser.id};}
 async function afterApprovedLogin(){
  if(preferencesUser!==currentUser.id){const r=await client.from('passenger_preferences').select('*').eq('user_id',currentUser.id).maybeSingle();if(r.error)throw r.error;preferences=r.data||{};preferencesUser=currentUser.id;sessionStarted=storage.get('fasttrip.session.'+currentUser.id,0)||Date.parse(currentUser.last_sign_in_at)||Date.now();}
  updateMuteLabel();
  if(!preferences.guide_accepted_at){fillContacts('guideContact');screen('guide');return false;}
  if(!preferences.welcome_seen_at){screen('daroWelcome');el('daroWelcomeVideo').muted=!!preferences.voice_muted;return false;}
  void loadWeather();return true;
 }
 el('guideForm').onsubmit=async event=>{event.preventDefault();const btn=el('guideSubmit');btn.disabled=true;try{if(!el('guideConsent').checked)throw new Error('Lee y acepta las indicaciones antes de continuar.');await savePreferences({...contactPayload('guideContact'),guide_accepted_at:new Date().toISOString()});screen('daroWelcome');el('daroWelcomeVideo').muted=!!preferences.voice_muted;}catch(e){message('guideMessage',e.message||errorText(e));}finally{btn.disabled=false;}};
 el('finishWelcome').onclick=async()=>{el('finishWelcome').disabled=true;try{await savePreferences({welcome_seen_at:new Date().toISOString()});el('daroWelcomeVideo').pause();if(await checkPassenger())await loadTrips();}catch(e){message('welcomeMessage',errorText(e));}finally{el('finishWelcome').disabled=false;}};
 el('editContacts').onclick=()=>{fillContacts('editContact');message('contactsMessage','');el('contactsDialog').showModal();};
 el('closeContacts').onclick=()=>el('contactsDialog').close();
 el('contactsForm').onsubmit=async event=>{event.preventDefault();const b=event.currentTarget.querySelector('button');b.disabled=true;try{await savePreferences(contactPayload('editContact'));el('contactsDialog').close();}catch(e){message('contactsMessage',e.message||errorText(e));}finally{b.disabled=false;}};
 async function share(trip){
  const root=el('shareContacts');root.replaceChildren();
  const shareResult=await client.rpc('create_trip_share_link',{p_trip_id:trip.id});
  if(shareResult.error||typeof shareResult.data!=='string')throw new Error('No se pudo crear el enlace de seguimiento. Intenta nuevamente.');
  const detail=tripDetails.get(trip.id);let text='Seguimiento en tiempo real: '+shareResult.data+'\n'+'Estoy viajando con FAST TRIP. Recogida: '+trip.origin_text+'. Destino: '+trip.destination_text+'. Estado al compartir: '+(STATUS[trip.status]||trip.status)+'. Referencia: '+trip.id+'.';
  if(detail)text+=' Conductor: '+(detail.driver_name||'Por confirmar')+'. Unidad: '+(detail.unit_number||'Por confirmar')+'. Placa: '+(detail.plate||'Por confirmar')+'.';text+=' Central DARO: 0963171259.';
  for(let i=1;i<=3;i++){const n=preferences?.['contact_'+i+'_phone'];if(!n)continue;const a=document.createElement('a');a.className='outline';a.textContent='Compartir con '+(preferences['contact_'+i+'_name']||'Contacto '+i);a.href='https://wa.me/'+n+'?text='+encodeURIComponent(text);a.target='_blank';a.rel='noopener noreferrer';root.append(a);}
  if(!root.children.length){const p=document.createElement('p');p.textContent='Registra tus contactos de confianza en Mi cuenta.';root.append(p);}el('shareDialog').showModal();
 }
 el('closeShare').onclick=()=>el('shareDialog').close();
 function updateMuteLabel(){el('toggleVoice').textContent=preferences?.voice_muted?'Activar voz':'Silenciar voz';el('toggleVoice').setAttribute('aria-pressed',String(!!preferences?.voice_muted));}
 el('toggleVoice').onclick=async()=>{const muted=!preferences?.voice_muted;playedAudio.pause();el('daroWelcomeVideo').muted=muted;try{await savePreferences({voice_muted:muted});updateMuteLabel();}catch(e){message('weatherMessage','No se pudo guardar tu preferencia. Intenta nuevamente.');}};
 async function play(source,explicit=false){if(preferences?.voice_muted&&!explicit)return;playedAudio.pause();playedAudio.src=source;try{await playedAudio.play();}catch{message('weatherMessage','Pulsa «Escuchar» para permitir el audio en este dispositivo.');}}
 function notice(text,audioFile){latestNotice={text,audioFile};message('tripNoticeText',text);el('tripNotice').classList.remove('hidden');if(audioFile)void play('./media/'+audioFile);}
 el('replayNotice').onclick=()=>{if(latestNotice?.audioFile)void play('./media/'+latestNotice.audioFile,true);};
 async function loadWeather(force=false){
  if(!client||!currentUser||(!force&&Date.now()-weatherLoaded<1800000))return;
  try{const r=await client.functions.invoke('daro-weather',{body:{}});if(r.error)throw r.error;if(!r.data?.text||!r.data?.generated_at)throw new Error('Sin pronóstico');weather=r.data;weatherLoaded=Date.now();message('weatherText',weather.text);message('weatherUpdated','Guayaquil · actualizado '+new Date(weather.generated_at).toLocaleString('es-EC',{timeZone:'America/Guayaquil',dateStyle:'short',timeStyle:'short'}));message('weatherMessage','');}catch{weather=null;message('weatherText','El pronóstico no está disponible en este momento. Puedes continuar con tu viaje.');message('weatherUpdated','');}
 }
 el('listenWeather').onclick=async()=>{const btn=el('listenWeather');btn.disabled=true;try{await loadWeather(!weather?.audio_base64);if(!weather){message('weatherMessage','No se pudo obtener un pronóstico actualizado. Intenta más tarde.');return;}if(!weather.audio_base64){message('weatherMessage','El texto está actualizado, pero la lectura no está disponible. Intenta nuevamente más tarde.');return;}if(weatherAudioUrl)URL.revokeObjectURL(weatherAudioUrl);const data=Uint8Array.from(atob(weather.audio_base64),c=>c.charCodeAt(0));weatherAudioUrl=URL.createObjectURL(new Blob([data],{type:'audio/mpeg'}));await play(weatherAudioUrl,true);}finally{btn.disabled=false;}};
 const tripDetails=new Map();
 async function decorateTrip(trip,card){
  if(!['accepted','in_progress'].includes(trip.status))return;
  try{
   if(!tripDetails.has(trip.id)){const r=await client.rpc('passenger_trip_details',{p_trip_id:trip.id});if(!r.error&&r.data)tripDetails.set(trip.id,r.data);}
   const info=tripDetails.get(trip.id);if(info){const p=document.createElement('p');p.className='fine';p.textContent='Conductor: '+(info.driver_name||'Por confirmar')+' · Unidad: '+(info.unit_number||'Por confirmar')+' · Placa: '+(info.plate||'Por confirmar');card.append(p);}
   if(trip.status==='accepted'){const r=await client.rpc('passenger_boarding_pin',{p_trip_id:trip.id});if(!r.error&&r.data){const p=document.createElement('p');p.className='boarding-pin';p.textContent='PIN de abordaje: '+r.data;card.append(p);}}
  }catch{}
 }
 async function processTrips(list){
  if(!currentUser)return;
  const key='fasttrip.events.'+currentUser.id,seen=storage.get(key,{}),now=Date.now();
  for(const trip of list){
   if(trip.status==='accepted'&&!seen[trip.id+':accepted']){notice('Tu conductor ha sido asignado. Revisa su nombre, la placa y tu PIN de abordaje.','daro-asignado.mp3');seen[trip.id+':accepted']=true;}
   if(trip.arrived_at&&trip.status==='accepted'&&!seen[trip.id+':arrived']){notice('Tu conductor ha llegado. Verifica la unidad, usa el cinturón y entrega tu PIN para iniciar.','daro-llegada.mp3');seen[trip.id+':arrived']=true;}
   if(trip.status==='in_progress'&&!seen[trip.id+':started']){notice('Tu viaje ha comenzado. Mantén el cinturón abrochado y disfruta del camino.','daro-inicio.mp3');seen[trip.id+':started']=true;}
   const eta=Date.parse(trip.estimated_arrival_at);
   if(trip.status==='in_progress'&&now-Date.parse(trip.eta_updated_at)<90000&&Number.isFinite(eta)&&eta-now<=120000&&eta-now>=-120000&&!seen[trip.id+':belongings']){notice('Estamos cerca de tu destino. Revisa que lleves tu teléfono, documentos, equipaje y todas tus pertenencias.','daro-pertenencias.mp3');seen[trip.id+':belongings']=true;}
   if(trip.status==='completed'&&Date.parse(trip.completed_at)>=sessionStarted&&!seen[trip.id+':completed']){notice('Tu viaje ha finalizado. Antes de bajar, revisa todas tus pertenencias. Gracias por viajar con FAST TRIP.','daro-final.mp3');seen[trip.id+':completed']=true;}
  }
  const keys=Object.keys(seen);if(keys.length>300)for(const k of keys.slice(0,keys.length-300))delete seen[k];storage.set(key,seen);
  if(expiryTimer)clearTimeout(expiryTimer);expiryTimer=null;
  if(list.some(t=>ACTIVE.includes(t.status)))return false;
  const completed=list.filter(t=>t.status==='completed'&&Date.parse(t.completed_at)>=sessionStarted).map(t=>Date.parse(t.completed_at));if(!completed.length)return false;
  const deadline=Math.max(...completed)+15*60000;
  if(now>=deadline){await expireSession();return true;}
  expiryTimer=setTimeout(()=>{if(currentUser)void loadTrips();},Math.min(deadline-now+250,2147483647));return false;
 }
 async function expireSession(){if(!client||!currentUser)return;playedAudio.pause();const r=await client.auth.signOut({scope:'local'});if(r.error){message('syncStatus','No se pudo cerrar la sesión. Se volverá a intentar.');return;}reset();currentUser=null;profile=null;stopPolling();screen('access');message('accessMessage','Tu sesión se cerró 15 minutos después de finalizar el viaje. Ingresa para solicitar otro.');}
 function loggedIn(user){sessionStarted=Date.now();storage.set('fasttrip.session.'+user.id,sessionStarted);preferences=null;preferencesUser=null;}
 function reset(){stopCamera();if(expiryTimer)clearTimeout(expiryTimer);expiryTimer=null;preferences=null;preferencesUser=null;sessionStarted=0;playedAudio.pause();tripDetails.clear();weather=null;weatherLoaded=0;if(weatherAudioUrl)URL.revokeObjectURL(weatherAudioUrl);weatherAudioUrl=null;el('daroWelcomeVideo').pause();el('tripNotice').classList.add('hidden');}
 let destinationMap=null,destinationMarker=null;
 el('destination').addEventListener('input',()=>{destinationPoint=null;message('destinationLookupStatus','Confirma de nuevo el punto del destino después de cambiarlo.');});
 el('findDestination').onclick=()=>{
  if(!client||!currentUser)return;if(el('destination').value.trim().length<5){message('destinationLookupStatus','Escribe primero la dirección o nombre del destino.');return;}
  if(!window.L){message('destinationLookupStatus','No se pudo cargar el mapa. Revisa tu conexión y vuelve a abrir la app.');return;}
  el('destinationMap').classList.remove('hidden');
  if(!destinationMap){destinationMap=window.L.map('destinationMap').setView([-2.1962,-79.8862],13);window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(destinationMap);
   destinationMap.on('click',event=>{const point=event.latlng;destinationPoint={lat:point.lat,lng:point.lng,text:el('destination').value.trim()};if(destinationMarker)destinationMarker.setLatLng(point);else destinationMarker=window.L.marker(point).addTo(destinationMap);message('destinationLookupStatus','Destino confirmado en el punto que seleccionaste. Puedes tocar otro punto para corregirlo.');});
  }
  setTimeout(()=>destinationMap.invalidateSize(),0);message('destinationLookupStatus','Mueve o amplía el mapa y toca el punto exacto de tu destino.');
 };
 let lastEtaCheck=0;
 async function refreshEta(list){const trip=list.find(t=>t.status==='in_progress');if(!trip||Date.now()-lastEtaCheck<60000)return;lastEtaCheck=Date.now();try{const r=await client.functions.invoke('passenger-routing',{body:{action:'eta',trip_id:trip.id}});if(!r.error){trip.estimated_arrival_at=r.data?.estimated_arrival_at||null;if(r.data?.eta_updated_at)trip.eta_updated_at=r.data.eta_updated_at;}}catch{}}
 function tripDestination(){return destinationPoint&&destinationPoint.text===el('destination').value.trim()?destinationPoint:null;}
 function clearDestination(){destinationPoint=null;el('destinationMap').classList.add('hidden');if(destinationMarker){destinationMap.removeLayer(destinationMarker);destinationMarker=null;}message('destinationLookupStatus','Confirma la ubicación del destino para calcular la proximidad de llegada.');}
 return {refreshEta,tripDestination,clearDestination,submitRegistration,afterApprovedLogin,share,decorateTrip,processTrips,loggedIn,reset,stopCamera,loadWeather,phone};
})();
