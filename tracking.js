(()=>{'use strict';
 const client=window.supabase.createClient('https://ftiuzwwshcocvkvtdngm.supabase.co','sb_publishable_JNcWc4KR76hOSqe9mvs9Tw_Vu4XOicE',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const token=new URLSearchParams(location.hash.slice(1)).get('token');const el=id=>document.getElementById(id);let lastPoint='',busy=false,expired=false;
 async function refresh(){if(busy||expired||document.hidden)return;busy=true;
  try{
   if(!/^[a-f0-9]{64}$/.test(token||'')){el('status').textContent='Necesitas un enlace de viaje válido.';expired=true;return;}
   const r=await client.rpc('read_shared_trip',{p_token:token});if(r.error)throw r.error;const t=r.data;
   if(!t){el('status').textContent='Este enlace venció o el viaje ya no está disponible.';el('route').textContent='';el('driver').textContent='';el('vehicle').textContent='';el('updated').textContent='';el('map').hidden=true;el('map').removeAttribute('src');expired=true;return;}
   el('status').textContent=({accepted:'Conductor asignado',in_progress:'Viaje en curso',completed:'Viaje finalizado'})[t.status]||'Consultando viaje';el('route').textContent=t.origin+' → '+t.destination;el('driver').textContent='Conductor: '+(t.driver||'Por confirmar');el('vehicle').textContent='Vehículo: '+(t.vehicle||'Por confirmar')+' · Placa: '+(t.plate||'Por confirmar')+' · Unidad: '+(t.unit||'Por confirmar');
   const lat=Number(t.latitude),lng=Number(t.longitude);if(t.latitude!=null&&t.longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180){const point=lat+','+lng;if(point!==lastPoint){lastPoint=point;el('map').src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent([lng-.008,lat-.006,lng+.008,lat+.006].join(','))+'&layer=mapnik&marker='+encodeURIComponent(point);}el('map').hidden=false;}else{el('map').hidden=true;el('map').removeAttribute('src');}
   el('updated').textContent=t.recorded_at?(t.location_fresh?'Ubicación actualizada: ':'Última ubicación disponible: ')+new Date(t.recorded_at).toLocaleString('es-EC'):t.status==='completed'?'Gracias por acompañar el viaje.':'Esperando el primer punto GPS.';
   el('notice').textContent='';
  }catch{el('notice').textContent='No se pudo actualizar. Se reintentará automáticamente; la información anterior puede estar desactualizada.';}finally{busy=false;}
 }
 void refresh();setInterval(refresh,12000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
})();
