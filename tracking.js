(()=>{'use strict';
 const client=window.supabase.createClient('https://ftiuzwwshcocvkvtdngm.supabase.co','sb_publishable_JNcWc4KR76hOSqe9mvs9Tw_Vu4XOicE',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const token=new URLSearchParams(location.hash.slice(1)).get('token');const el=id=>document.getElementById(id);let busy=false,expired=false,lastView=null;
 const map=liveTripMap.create(el('map'));
 function clearMap(){
  map.clear();
  el('mapLegend').textContent='';
 }
 async function refresh(){if(busy||expired||document.hidden)return;busy=true;
  try{
   if(!/^[a-f0-9]{64}$/.test(token||'')){el('status').textContent='Necesitas un enlace de viaje válido.';expired=true;return;}
   const r=await client.rpc('read_shared_trip',{p_token:token});if(r.error)throw r.error;const t=r.data;
   if(!t){el('status').textContent='Este enlace venció o el viaje ya no está disponible.';el('route').textContent='';el('driver').textContent='';el('vehicle').textContent='';el('updated').textContent='';clearMap();expired=true;return;}
   el('status').textContent=({accepted:'Conductor asignado',in_progress:'Viaje en curso',completed:'Viaje finalizado'})[t.status]||'Consultando viaje';el('route').textContent=t.origin+' → '+t.destination;el('driver').textContent='Conductor: '+(t.driver||'Por confirmar');el('vehicle').textContent='Vehículo: '+(t.vehicle||'Por confirmar')+' · Placa: '+(t.plate||'Por confirmar')+' · Unidad: '+(t.unit||'Por confirmar');
   const vehicle=tripMaps.coordinates(t.latitude,t.longitude);
   const pickup=t.status==='accepted'?tripMaps.coordinates(t.pickup_lat,t.pickup_lng):null;
   const destination=t.status==='completed'?null:tripMaps.coordinates(t.destination_lat,t.destination_lng);
   const fresh=Boolean(vehicle&&t.location_fresh&&liveTripMap.isFresh(t.recorded_at));
   lastView={vehicle,pickup,destination,status:t.status};
   map.update({...lastView,fresh});
   el('mapLegend').textContent=[
     pickup&&'Azul: recogida',destination&&'Naranja: destino',
     vehicle&&(fresh?'Verde: vehículo':'Gris: última ubicación')
   ].filter(Boolean).join(' · ');
   el('updated').textContent=t.status==='completed'?'Gracias por acompañar el viaje.':t.recorded_at?(fresh?'Ubicación actualizada: ':'Última ubicación disponible: ')+new Date(t.recorded_at).toLocaleString('es-EC'):'Esperando el primer punto GPS.';
   if(t.status==='completed')expired=true;
   el('notice').textContent='';
  }catch{if(lastView){map.update({...lastView,fresh:false});el('mapLegend').textContent=el('mapLegend').textContent.replace('Verde: vehículo','Gris: última ubicación');}el('notice').textContent='No se pudo actualizar. Se reintentará automáticamente; la información anterior puede estar desactualizada.';}finally{busy=false;}
 }
 void refresh();setInterval(refresh,12000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
})();
