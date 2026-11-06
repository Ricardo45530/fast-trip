'use strict';
const SUPABASE_URL='https://ftiuzwwshcocvkvtdngm.supabase.co';
const SUPABASE_KEY='sb_publishable_JNcWc4KR76hOSqe9mvs9Tw_Vu4XOicE';
const REDIRECT_URL='https://ricardo45530.github.io/fast-trip/pasajeros/';
const $=id=>document.getElementById(id);
const message=(id,text)=>$(id).textContent=text;
const ACTIVE=['pending','offered','accepted','in_progress'];
const STATUS={pending:'Buscando conductor',offered:'Esperando confirmación',accepted:'Conductor asignado',in_progress:'En camino a tu destino',completed:'Viaje completado',cancelled:'Viaje cancelado',rejected:'Solicitud rechazada',no_driver:'Sin conductor disponible'};
const MONEY=new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'});
let client,currentUser=null,profile=null,recovering=false,trips=[],cancelRequests=[],loading=false,poll=null,pickup=null,action=null,lastRender='',activeScreen='welcome';
function screen(id){if(id==='registration'&&!passengerExperience.hasAcceptedTerms())id='terms';activeScreen=id;for(const name of ['welcome','terms','access','registration','reset','tripPanel'])$(name).classList.toggle('hidden',name!==id);window.scrollTo(0,0);}
function tab(id){document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('hidden',x.id!==id));document.querySelectorAll('[data-tab]').forEach(x=>{if(x.dataset.tab===id)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});}
function whatsapp(text){return 'https://wa.me/593963171259?text='+encodeURIComponent(text);}
function errorText(error){if(!navigator.onLine)return 'Sin conexión. Revisa tu señal e intenta nuevamente.';if(error?.code==='23505')return 'Esta solicitud ya está registrada. Actualiza el estado antes de intentar otra vez.';return 'No pudimos completar la operación. Intenta nuevamente o contacta a DARO.';}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function link(text,url){const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function button(text,run,cls){const b=node('button',text,cls);b.type='button';b.onclick=run;return b;}
function connection(){ $('connection').classList.toggle('hidden',navigator.onLine); }
function stopPolling(){if(poll)clearInterval(poll);poll=null;trips=[];cancelRequests=[];lastRender='';$('tripHistory').replaceChildren();}
async function checkPassenger(){
 const {data,error}=await client.auth.getUser();
 if(error||!data?.user){currentUser=null;stopPolling();screen('access');return false;}
 const p=await client.from('profiles').select('id,full_name,phone,role,status').eq('id',data.user.id).maybeSingle();
 if(p.error){message('accessMessage',errorText(p.error));screen('access');return false;}
 if(p.data?.role!=='passenger'||p.data?.status!=='approved'){currentUser=null;stopPolling();screen('access');message('accessMessage','Tu cuenta necesita la aprobación de Administración. Comunícate con DARO para revisar tu registro.');return false;}
 currentUser=data.user;profile=p.data;passengerExperience.markReturning();if(passengerExperience.sessionUser!==currentUser.id){passengerExperience.sessionUser=currentUser.id;passengerExperience.nextLandscape();}
 message('greeting','HOLA, '+(profile.full_name||'PASAJERO').split(' ')[0].toUpperCase());
 message('profileName',profile.full_name);message('profilePhone',profile.phone||'Teléfono por confirmar con DARO');
 screen('tripPanel');if(!poll)poll=setInterval(()=>{if(!document.hidden&&activeScreen==='tripPanel')void loadTrips();},12000);return true;
}
async function loadTrips(){
 if(!currentUser||loading)return;loading=true;
 try{
 const uid=currentUser.id;
 const [t,c]=await Promise.all([
 client.from('trips').select('id,passenger_id,driver_id,origin_text,destination_text,service_type,status,created_at,total_amount').eq('passenger_id',uid).order('created_at',{ascending:false}).limit(30),
 client.from('trip_cancellation_requests').select('id,trip_id,status,created_at').eq('requester_id',uid).order('created_at',{ascending:false}).limit(60)
 ]);
 if(currentUser?.id!==uid)return;
 if(t.error)throw t.error;
 trips=t.data||[];cancelRequests=c.data||[];
 message('syncStatus',c.error?'Viajes actualizados. No se pudieron consultar las cancelaciones.':'Actualizado a las '+new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})+' · se actualiza cada 12 segundos');
 const signature=JSON.stringify([trips,cancelRequests]);if(signature!==lastRender){lastRender=signature;renderTrips();}
 const active=trips.some(x=>ACTIVE.includes(x.status));$('sendBtn').disabled=active;
 if(active)message('tripMessage','Ya tienes una solicitud activa. Consulta su estado en Mis viajes.');
 }catch(e){message('syncStatus',errorText(e)+' Se conserva la última información disponible.');}finally{loading=false;}
}
function renderTrips(){
 const root=$('tripHistory');root.replaceChildren();
 if(!trips.length){root.append(node('p','Tu próximo destino te espera. Aquí aparecerán tus viajes.','empty'));return;}
 for(const t of trips){
 const card=node('article',undefined,'card trip-card');card.append(node('span',STATUS[t.status]||'Actualizando estado','badge'));
 const route=node('p',t.origin_text,'trip-route');route.append(node('span','↳ '+t.destination_text));card.append(route);
 card.append(node('p',t.service_type+' · '+new Date(t.created_at).toLocaleString('es-EC',{dateStyle:'medium',timeStyle:'short'}),'fine'));
 card.append(node('p',t.total_amount==null?'Tarifa por confirmar con FAST TRIP':'Tarifa registrada: '+MONEY.format(Number(t.total_amount)),'fine'));
 const actions=node('div',undefined,'trip-actions');
 if(ACTIVE.includes(t.status)){
  const pending=cancelRequests.find(c=>c.trip_id===t.id&&c.status==='pending');
  if(pending)card.append(node('p','Cancelación pendiente de aprobación. El viaje sigue activo.','message'));
  else actions.append(button('Solicitar cancelación',()=>openAction('cancel',t)));
  const decision=cancelRequests.find(c=>c.trip_id===t.id&&c.status==='rejected');if(decision&&!pending)card.append(node('p','Administración rechazó la cancelación anterior. Contacta a DARO.','fine'));
  actions.append(button('Pedir asistencia',()=>openAction('panic',t),'danger'));
  actions.append(link('Hablar con DARO',whatsapp('Hola DARO, necesito ayuda con el viaje '+t.id+'.')));
 }
 if(['accepted','in_progress'].includes(t.status)){
  actions.append(button('Ubicación del conductor',()=>driverLocation(t,card)));
  actions.append(button('Compartir viaje',()=>shareTrip(t,card)));
 }
 if(t.status==='completed'&&t.driver_id)actions.append(button('Calificar viaje',()=>openAction('rating',t)));
 card.append(actions);root.append(card);
 }
}
async function driverLocation(t,card){
 let line=card.querySelector('.gps-note');if(!line){line=node('p','','fine gps-note');card.append(line);}line.textContent='Consultando ubicación…';
 const r=await client.from('trip_gps_points').select('latitude,longitude,recorded_at').eq('trip_id',t.id).order('recorded_at',{ascending:false}).limit(1);
 if(r.error||!r.data?.length){line.textContent='Aún no hay ubicación registrada para este viaje. Consulta con DARO.';return;}
 const p=r.data[0];const age=Date.now()-new Date(p.recorded_at).getTime();line.replaceChildren(node('span',(age>120000?'Último registro disponible · ':'Ubicación registrada · ')+new Date(p.recorded_at).toLocaleTimeString('es-EC')+' '));line.append(link('Ver en Google Maps ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.latitude+','+p.longitude)));
}
async function shareTrip(t,card){
 const text='Estoy viajando con FAST TRIP. Recogida: '+t.origin_text+'. Destino: '+t.destination_text+'. Estado: '+STATUS[t.status]+'. Referencia: '+t.id+'. Central DARO: 0963171259. Este mensaje muestra el estado al compartir; no es seguimiento en vivo.';
 try{if(navigator.share)await navigator.share({title:'Mi viaje FAST TRIP',text});else{const a=link('Enviar datos del viaje por WhatsApp ↗','https://wa.me/?text='+encodeURIComponent(text));a.className='daro';card.append(a);}}catch(e){if(e.name!=='AbortError')card.append(node('p','No se pudo compartir. Puedes contactar a DARO.','fine'));}
}
function openAction(type,trip){
 action={type,trip};message('actionMessage','');$('actionText').value='';$('ratingField').classList.toggle('hidden',type!=='rating');$('actionText').required=type==='cancel';$('actionText').minLength=type==='cancel'?5:0;
 const copy={cancel:['Solicitar cancelación','Administración debe aprobar la solicitud. Mientras tanto, tu viaje permanece activo.','Motivo de cancelación','Solicitar aprobación'],panic:['¿Necesitas asistencia urgente?','La alerta se registra en Administración. Para atención inmediata, contacta también a DARO. En una emergencia real puedes llamar al ECU 911.','¿Qué sucede? (opcional)','Enviar alerta a Administración'],rating:['¿Cómo estuvo tu viaje?','Tu calificación individual y comentario los revisa Administración.','Comentario (opcional)','Enviar calificación']}[type];
 message('actionTitle',copy[0]);message('actionDescription',copy[1]);message('actionLabel',copy[2]);message('actionSubmit',copy[3]);$('actionSubmit').disabled=false;$('actionDialog').showModal();
}
$('actionForm').onsubmit=async e=>{
 e.preventDefault();if(!action||!currentUser)return;const btn=$('actionSubmit');btn.disabled=true;
 try{
 const {trip,type}=action;const text=$('actionText').value.trim();let r;
 if(type==='cancel'){if(text.length<5){message('actionMessage','Escribe un motivo de al menos 5 caracteres.');return;}r=await client.from('trip_cancellation_requests').insert({trip_id:trip.id,requester_id:currentUser.id,requester_role:'passenger',reason:text});}
 else if(type==='panic')r=await client.from('security_incidents').insert({trip_id:trip.id,incident_type:'passenger_panic',status:'open',description:text||'Pasajero solicita asistencia urgente desde su app.'});
 else r=await client.from('trip_ratings').insert({trip_id:trip.id,rater_id:currentUser.id,rated_user_id:trip.driver_id,score:Number($('rating').value),comment:text||null});
 if(r.error)throw r.error;
 if(type==='panic'){message('actionMessage','Alerta registrada en Administración.');const a=link('Contactar a DARO ahora por WhatsApp ↗',whatsapp('URGENTE DARO: necesito asistencia en el viaje '+trip.id+'. '+text));a.className='daro';$('actionMessage').append(a);}
 else message('actionMessage',type==='cancel'?'Solicitud registrada. Espera la decisión de Administración.':'Gracias. Tu calificación fue registrada.');
 btn.disabled=true;await loadTrips();
 }catch(err){message('actionMessage',errorText(err));btn.disabled=false;}
};
$('actionClose').onclick=()=>$('actionDialog').close();
$('actionText').addEventListener('input',()=>{if(action?.type==='cancel'&&$('actionText').value.trim().length>=5)$('actionSubmit').disabled=false;});
$('locateBtn').onclick=()=>{
 if(!navigator.geolocation){message('locationStatus','Tu dispositivo no permite compartir ubicación. Escribe la dirección.');return;}
 $('locateBtn').disabled=true;message('locationStatus','Solicitando permiso de ubicación…');
 navigator.geolocation.getCurrentPosition(p=>{pickup={lat:p.coords.latitude,lng:p.coords.longitude};message('locationStatus','Ubicación adjunta. Añade la dirección o una referencia para recogerte.');$('origin').focus();$('locateBtn').disabled=false;},()=>{pickup=null;message('locationStatus','No se pudo obtener ubicación. Escribe tu dirección de recogida.');$('locateBtn').disabled=false;},{enableHighAccuracy:true,timeout:15000,maximumAge:30000});
};
$('tripForm').onsubmit=async e=>{
 e.preventDefault();if(!client||!currentUser)return;const btn=$('sendBtn');btn.disabled=true;
 try{
 const origin=$('origin').value.trim(),destination=$('destination').value.trim();
 if(!origin||!destination||origin.toLowerCase()===destination.toLowerCase()){message('tripMessage','Indica origen y destino diferentes.');return;}
 const uid=currentUser.id;const active=await client.from('trips').select('id').eq('passenger_id',uid).in('status',ACTIVE).limit(1);
 if(active.error)throw active.error;if(active.data?.length){message('tripMessage','Ya tienes un viaje activo. Consulta Mis viajes.');await loadTrips();tab('history');return;}
 const p=await client.from('profiles').select('role,status').eq('id',uid).single();if(p.error||p.data.role!=='passenger'||p.data.status!=='approved'){currentUser=null;stopPolling();screen('access');message('accessMessage','Tu cuenta necesita aprobación de Administración.');return;}
 const payload={passenger_id:uid,origin_text:origin,destination_text:destination,service_type:$('service').value,notes:$('notes').value.trim()||null,status:'pending'};
 if(pickup){payload.pickup_lat=pickup.lat;payload.pickup_lng=pickup.lng;}
 const r=await client.from('trips').insert(payload);if(r.error)throw r.error;passengerExperience.nextLandscape();
 $('tripForm').reset();pickup=null;message('locationStatus','');message('tripMessage','Solicitud enviada. Espera la confirmación de un conductor.');await loadTrips();tab('history');
 }catch(err){message('tripMessage',errorText(err));}finally{btn.disabled=trips.some(t=>ACTIVE.includes(t.status));}
};
$('registrationForm').onsubmit=async e=>{
 e.preventDefault();if(!client){message('registrationMessage','Sin conexión. Intenta nuevamente.');return;}const btn=$('registrationSubmit');btn.disabled=true;
 try{const f=new FormData(e.currentTarget);const payload={};for(const k of ['full_name','national_id','phone','email','address'])payload[k]=String(f.get(k)||'').trim();payload.email=payload.email.toLowerCase();payload.city='Guayaquil';if(Object.values(payload).some(v=>!v))throw new Error('Completa todos los datos.');
 const r=await client.from('passenger_registration_requests').insert(payload);if(r.error)throw r.error;e.target.reset();message('registrationMessage','Solicitud recibida. Administración revisará tus datos. Completa tu fotografía con DARO y espera la aprobación antes de solicitar viajes.');
 }catch(err){message('registrationMessage',errorText(err));}finally{btn.disabled=false;}
};
$('loginForm').onsubmit=async e=>{
 e.preventDefault();if(!client){message('accessMessage','No se pudo conectar. Recarga la app e intenta nuevamente.');return;}$('loginSubmit').disabled=true;message('accessMessage','Verificando tu cuenta…');
 try{const r=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(r.error){message('accessMessage','No pudimos iniciar sesión. Revisa tus datos o recupera tu contraseña.');return;}message('accessMessage','');if(await checkPassenger())await loadTrips();}catch(err){message('accessMessage',errorText(err));}finally{$('loginSubmit').disabled=false;}
};
async function passwordLink(mode){
 if(!client)return;const email=$('email');if(!email.value.trim()||!email.checkValidity()){message('accessMessage','Escribe un correo válido para recibir el enlace.');email.focus();return;}
 $('recoverBtn').disabled=$('createBtn').disabled=true;message('accessMessage','Solicitando enlace seguro…');
 try{const r=await client.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:REDIRECT_URL});if(r.error)throw r.error;message('accessMessage','Si tu correo tiene una cuenta, recibirás un enlace para '+(mode==='create'?'crear':'recuperar')+' tu contraseña. Revisa también correo no deseado.');}catch(err){message('accessMessage',errorText(err));}finally{$('recoverBtn').disabled=$('createBtn').disabled=false;}
}
$('resetForm').onsubmit=async e=>{
 e.preventDefault();if(!client)return;const a=$('newPassword').value,b=$('confirmPassword').value;if(a.length<8||a!==b){message('resetMessage','Las contraseñas deben coincidir y tener al menos 8 caracteres.');return;}
 const btn=e.target.querySelector('button');btn.disabled=true;try{const r=await client.auth.updateUser({password:a});if(r.error)throw r.error;await client.auth.signOut();recovering=false;history.replaceState({},'',location.pathname);e.target.reset();screen('access');message('accessMessage','Contraseña actualizada. Ya puedes iniciar sesión.');}catch(err){message('resetMessage',errorText(err));}finally{btn.disabled=false;}
};
$('suggestionForm').onsubmit=async e=>{
 e.preventDefault();if(!client||!currentUser)return;const btn=e.target.querySelector('button'),text=$('suggestion').value.trim();if(text.length<5){message('suggestionMessage','Escribe al menos 5 caracteres.');return;}btn.disabled=true;
 try{const r=await client.from('suggestions').insert({user_id:currentUser.id,role:'passenger',message:text});if(r.error)throw r.error;e.target.reset();message('suggestionMessage','Gracias. Tu mensaje quedó registrado en Administración.');}catch(err){message('suggestionMessage',errorText(err));}finally{btn.disabled=false;}
};
$('startBtn').onclick=async()=>{screen('access');if(client&&await checkPassenger())await loadTrips();};
$('registerBtn').onclick=$('welcomeRegister').onclick=()=>screen(passengerExperience.hasAcceptedTerms()?'registration':'terms');
$('acceptTerms').onclick=()=>{passengerExperience.acceptTerms();message('termsMessage','');screen('registration');};
$('declineTerms').onclick=()=>{message('termsMessage','Has elegido no aceptar. Para iniciar tu solicitud necesitas aceptar las condiciones. Puedes volver o contactar a DARO si tienes dudas.');};
$('showPassword').onclick=()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';message('showPassword',show?'Ocultar':'Ver');$('showPassword').setAttribute('aria-pressed',String(show));$('showPassword').setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');};
$('recoverBtn').onclick=()=>passwordLink('recover');$('createBtn').onclick=()=>passwordLink('create');$('refreshBtn').onclick=()=>loadTrips();
$('logoutBtn').onclick=async()=>{if(!client)return;const r=await client.auth.signOut();if(r.error){message('syncStatus',errorText(r.error));return;}currentUser=null;profile=null;pickup=null;passengerExperience.sessionUser=null;stopPolling();screen('access');};
for(const a of document.querySelectorAll('[data-wa]')){a.href=whatsapp(a.dataset.wa);a.target='_blank';a.rel='noopener noreferrer';}
for(const b of document.querySelectorAll('[data-screen]'))b.onclick=()=>screen(b.dataset.screen);
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab(b.dataset.tab);if(b.dataset.tab==='history')void loadTrips();};
window.addEventListener('online',()=>{connection();if(currentUser)void loadTrips();});window.addEventListener('offline',connection);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)void loadTrips();});
async function init(){
 screen(passengerExperience.isReturning()?'access':'welcome');connection();if(!window.supabase){screen(passengerExperience.isReturning()?'access':'welcome');message('connection','No se pudo conectar con FAST TRIP. Revisa tu conexión y vuelve a abrir la app.');$('connection').classList.remove('hidden');return;}
 const h=new URLSearchParams(location.hash.slice(1)),q=new URLSearchParams(location.search);recovering=['recovery','invite'].includes(h.get('type'))||['recovery','invite'].includes(q.get('type'));
 client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;screen('reset');}else if(event==='SIGNED_IN'&&recovering){screen('reset');}else if(event==='SIGNED_OUT'){currentUser=null;stopPolling();screen('access');}});

 const r=await client.auth.getSession();if(recovering&&r.data?.session){screen('reset');return;}if(r.data?.session&&await checkPassenger())await loadTrips();
}
init().catch(()=>{screen(passengerExperience.isReturning()?'access':'welcome');message('connection','No se pudo iniciar la app. Revisa tu conexión y vuelve a abrirla.');$('connection').classList.remove('hidden');});
