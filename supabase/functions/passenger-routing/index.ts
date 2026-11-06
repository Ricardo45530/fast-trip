import {createClient} from 'npm:@supabase/supabase-js@2.49.1';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://ricardo45530.github.io','https://fasttripecuador.com','https://www.fasttripecuador.com']);
Deno.serve(async req=>{
 const origin=req.headers.get('origin'),headers:Record<string,string>={'content-type':'application/json','vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{message:'Origen no autorizado'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{message:'Método no permitido'});
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply(401,{message:'Inicia sesión'});
 const user=await db.auth.getUser(token);if(user.error||!user.data.user)return reply(401,{message:'Sesión inválida'});
 const profile=await db.from('profiles').select('role,status').eq('id',user.data.user.id).maybeSingle();if(profile.data?.status!=='approved')return reply(403,{message:'Cuenta no aprobada'});
 try{
  const body=await req.json();
  if(body.action!=='eta'||!/^[0-9a-f-]{36}$/i.test(body.trip_id||''))return reply(400,{message:'Solicitud inválida'});
  const result=await db.from('trips').select('id,passenger_id,driver_id,status,destination_lat,destination_lng,estimated_arrival_at,eta_updated_at').eq('id',body.trip_id).maybeSingle();const trip=result.data;
  if(!trip||![trip.passenger_id,trip.driver_id].includes(user.data.user.id))return reply(403,{message:'No participas en este viaje'});
  if(trip.status!=='in_progress')return reply(200,{estimated_arrival_at:null});
  if(trip.eta_updated_at&&Date.now()-Date.parse(trip.eta_updated_at)<60000)return reply(200,{estimated_arrival_at:trip.estimated_arrival_at,eta_updated_at:trip.eta_updated_at});
  if(trip.destination_lat==null||trip.destination_lng==null)return reply(200,{estimated_arrival_at:null,message:'Falta la ubicación confirmada del destino'});
  const gps=await db.from('trip_gps_points').select('latitude,longitude,recorded_at').eq('trip_id',trip.id).order('recorded_at',{ascending:false}).limit(1);const point=gps.data?.[0];
  if(!point||Date.now()-Date.parse(point.recorded_at)>120000){await db.from('trips').update({estimated_arrival_at:null,eta_updated_at:new Date().toISOString()}).eq('id',trip.id).eq('status','in_progress');return reply(200,{estimated_arrival_at:null,message:'Esperando GPS reciente'});}
  const coords=[Number(point.longitude),Number(point.latitude),Number(trip.destination_lng),Number(trip.destination_lat)];if(coords.some(x=>!Number.isFinite(x)))return reply(200,{estimated_arrival_at:null});
  const routeUrl='https://routing.openstreetmap.de/routed-car/route/v1/driving/'+coords[0].toFixed(5)+','+coords[1].toFixed(5)+';'+coords[2].toFixed(5)+','+coords[3].toFixed(5)+'?overview=false';
  const slot=await db.rpc('claim_map_request',{p_service:'routing'});if(slot.error||slot.data!==true)return reply(200,{estimated_arrival_at:trip.estimated_arrival_at,eta_updated_at:trip.eta_updated_at});
  const response=await fetch(routeUrl,{headers:{'User-Agent':'FASTTRIP/1.0 https://fasttripecuador.com'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Ruta no disponible');
  const route=await response.json(),seconds=route.routes?.[0]?.duration;if(route.code!=='Ok'||!Number.isFinite(seconds))throw new Error('Ruta no disponible');
  const estimated_arrival_at=new Date(Date.now()+seconds*1000).toISOString();
  const saved=await db.from('trips').update({estimated_arrival_at,eta_updated_at:new Date().toISOString()}).eq('id',trip.id).eq('status','in_progress');if(saved.error)throw saved.error;
  return reply(200,{estimated_arrival_at,eta_updated_at:new Date().toISOString(),remaining_seconds:Math.round(seconds),source:'OSRM',traffic_included:false});
 }catch{return reply(503,{message:'No se pudo calcular la ubicación o el tiempo de llegada. Intenta más tarde.'});}
});
