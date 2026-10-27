/* FAST TRIP — complemento no destructivo para index.html principal.
   Añadir como <script src="./FAST_TRIP_admin_complemento.js" defer></script>
   justo antes de </body>. Requiere las variables globales client y verificarAdministrador
   definidas en el index actual. La tabla public.suggestions y RLS deben existir. */
(()=>{
'use strict';
const CENTRAL='593963461706';
const link=(message)=>'https://wa.me/'+CENTRAL+'?text='+encodeURIComponent(message);
const start=()=>{
  document.querySelectorAll('a[href*="wa.me/593982831006"]').forEach(a=>{
    a.href=link('Hola Central FAST TRIP. Deseo registrarme como conductor.');
  });
  const panel=document.getElementById('adminPanel');
  if(!panel)return;
  const section=document.createElement('section');
  section.innerHTML=`<h3>📞 Central FAST TRIP</h3>
  <p class="note">WhatsApp exclusivo: 0963461706. Las llamadas se inician dentro de WhatsApp.</p>
  <a class="button" target="_blank" rel="noopener noreferrer" href="${link('Hola Central FAST TRIP, necesito comunicarme con ustedes.')}">💬 Mensaje a Central</a>
  <a class="button" target="_blank" rel="noopener noreferrer" href="${link('Hola Central FAST TRIP, solicito una llamada por WhatsApp.')}">📞 Solicitar llamada</a>
  <h3>💡 Sugerencias y reclamos</h3>
  <button type="button" id="ftLoadSuggestions">Consultar sugerencias</button>
  <div id="ftSuggestions" aria-live="polite"></div>`;
  panel.insertBefore(section,document.getElementById('btnSalir'));
  document.getElementById('ftLoadSuggestions').addEventListener('click',async()=>{
    const box=document.getElementById('ftSuggestions');box.textContent='Consultando...';
    try{
      if(typeof verificarAdministrador!=='function'||!await verificarAdministrador())throw Error('Acceso administrativo no autorizado.');
      if(typeof client==='undefined'||!client)throw Error('Primero inicia sesión.');
      const {data,error}=await client.from('suggestions').select('id,user_id,role,message,status,created_at').order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      box.replaceChildren();if(!data?.length){box.textContent='No hay sugerencias registradas.';return;}
      for(const item of data){
        const div=document.createElement('div');div.className='entry';
        const p=document.createElement('p');p.textContent=${item.role||'Usuario'} · ${item.created_at||''}\n${item.message||''}\nEstado: ${item.status||'pendiente'};div.appendChild(p);
        const select=document.createElement('select');
        ['pending','in_progress','resolved'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=({pending:'Pendiente',in_progress:'En proceso',resolved:'Resuelta'})[v];select.appendChild(o);});
        select.value=item.status||'pending';
        const b=document.createElement('button');b.type='button';b.textContent='Guardar estado';
        b.onclick=async()=>{b.disabled=true;const r=await client.from('suggestions').update({status:select.value}).eq('id',item.id);alert(r.error?'No se pudo guardar: '+r.error.message:'Estado guardado');b.disabled=false;};
        div.append(select,b);box.appendChild(div);
      }
    }catch(e){box.textContent='No disponible: '+e.message+'. Revisar tabla y políticas RLS en Supabase.';}
  });
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
