import {createClient} from 'npm:@supabase/supabase-js@2.49.1';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://ricardo45530.github.io','https://fasttripecuador.com','https://www.fasttripecuador.com']);
type PhotonFeature = {
 geometry?: {coordinates?: [number, number]};
 properties?: {name?: string; street?: string; housenumber?: string; district?: string; city?: string; state?: string; countrycode?: string};
};
const googleKey = Deno.env.get('GOOGLE_MAPS_SERVER_KEY');
const guayaquil = {latitude:-2.1962,longitude:-79.8862};
async function googleRequest(url:string, fields:string, body:object) {
 const response = await fetch(url,{
  method:'POST',
  headers:{'Content-Type':'application/json','X-Goog-Api-Key':googleKey!,'X-Goog-FieldMask':fields},
  body:JSON.stringify(body),signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error('Google Maps no disponible');
 return await response.json();
}
type GooglePlace = {
 displayName?: {text?: string};
 formattedAddress?: string;
 location?: {latitude?: number; longitude?: number};
 addressComponents?: {longText?: string; shortText?: string; types?: string[]}[];
 attributions?: {provider?: string}[];
};
async function searchGoogle(query:string, field:unknown) {
 const slot=await db.rpc('claim_map_request',{p_service:field==='pickup'?'google_pickup_search':'google_destination_search'});
 if(slot.error||slot.data!==true)throw new Error('Búsqueda ocupada');
 const data=await googleRequest('https://places.googleapis.com/v1/places:searchText',
  'places.displayName,places.formattedAddress,places.location,places.addressComponents,places.attributions',
  {textQuery:query,languageCode:'es',regionCode:'EC',pageSize:5,
   locationBias:{circle:{center:guayaquil,radius:35000}}}) as {places?:GooglePlace[]};
 return (data.places||[]).flatMap(place=>{
  const component=(type:string)=>place.addressComponents?.find(part=>part.types?.includes(type));
  const loc=place.location;
  if(component('country')?.shortText!=='EC'||!loc||typeof loc.latitude!=='number'||typeof loc.longitude!=='number')return [];
  const street=[component('route')?.longText,component('street_number')?.longText].filter(Boolean).join(' ');
  const name=place.displayName?.text||street;
  const label=[...new Set([name,place.formattedAddress].filter(Boolean))].join(' · ');
  if(!label)return [];
  return [{lat:loc.latitude,lng:loc.longitude,name,street,label,attributions:place.attributions||[]}];
 });
}
async function googleDuration(coords:number[]) {
 const waypoint=(latitude:number,longitude:number)=>({location:{latLng:{latitude,longitude}}});
 const data=await googleRequest('https://routes.googleapis.com/directions/v2:computeRoutes','routes.duration',{
  origin:waypoint(coords[1],coords[0]),destination:waypoint(coords[3],coords[2]),
  travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE',regionCode:'EC'
 });
 const duration=data.routes?.[0]?.duration;
 if(typeof duration!=='string'||!/^\d+(\.\d+)?s$/.test(duration))throw new Error('Ruta no disponible');
 return Number(duration.slice(0,-1));
}
async function searchDestination(query:string){
 const url=new URL(Deno.env.get('PHOTON_SEARCH_URL')||'https://photon.komoot.io/api/');
 url.search=new URLSearchParams({q:query,limit:'5',lat:'-2.1962',lon:'-79.8862',bbox:'-92.1,-5.1,-75,1.7'}).toString();
 const slot=await db.rpc('claim_map_request',{p_service:'destination_search'});
 if(slot.error||slot.data!==true)throw new Error('Búsqueda ocupada');
 const response=await fetch(url,{headers:{'User-Agent':'FASTTRIP/1.0 https://fasttripecuador.com'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('Búsqueda no disponible');
 const {features}=await response.json() as {features:PhotonFeature[]};
 const results=[];
 for(const feature of features){
  const [lng,lat]=feature.geometry?.coordinates||[];
  const p=feature.properties;
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||p?.countrycode!=='EC')continue;
  const street=[p.street,p.housenumber].filter(Boolean).join(' ');
  const name=p.name||street;
  if(!name)continue;
  const label=[...new Set([name,street,p.district,p.city,p.state].filter(Boolean))].join(', ');
  if(results.some(result=>result.label===label&&result.lat===lat&&result.lng===lng))continue;
  results.push({lat,lng,name,street,label});
 }
 return results;
}
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
  if(body.action==='search_destination'){
   if(profile.data.role!=='passenger')return reply(403,{message:'Acceso de pasajero requerido'});
   const query=typeof body.query==='string'?body.query.trim():'';
   if(query.length<3||query.length>250)return reply(400,{message:'Revisa la dirección'});
   const useGoogle=body.google_maps===true;
   if(useGoogle&&!googleKey)return reply(503,{message:'Google Maps aún no está configurado'});
   return reply(200,{provider:useGoogle?'google':'osm',results:await (useGoogle?searchGoogle(query,body.field):searchDestination(query))});
  }
  if(body.action!=='eta'||!/^[0-9a-f-]{36}$/i.test(body.trip_id||''))return reply(400,{message:'Solicitud inválida'});
  const result=await db.from('trips').select('id,passenger_id,driver_id,status,destination_lat,destination_lng,estimated_arrival_at,eta_updated_at').eq('id',body.trip_id).maybeSingle();const trip=result.data;
  if(!trip||![trip.passenger_id,trip.driver_id].includes(user.data.user.id))return reply(403,{message:'No participas en este viaje'});
  if(trip.status!=='in_progress')return reply(200,{estimated_arrival_at:null});
  if(trip.eta_updated_at&&Date.now()-Date.parse(trip.eta_updated_at)<60000)return reply(200,{estimated_arrival_at:trip.estimated_arrival_at,eta_updated_at:trip.eta_updated_at});
  if(trip.destination_lat==null||trip.destination_lng==null)return reply(200,{estimated_arrival_at:null,message:'Falta la ubicación confirmada del destino'});
  const gps=await db.from('trip_gps_points').select('latitude,longitude,recorded_at').eq('trip_id',trip.id).order('recorded_at',{ascending:false}).limit(1);const point=gps.data?.[0];
  if(!point||Date.now()-Date.parse(point.recorded_at)>120000){await db.from('trips').update({estimated_arrival_at:null,eta_updated_at:new Date().toISOString()}).eq('id',trip.id).eq('status','in_progress');return reply(200,{estimated_arrival_at:null,message:'Esperando GPS reciente'});}
  const coords=[Number(point.longitude),Number(point.latitude),Number(trip.destination_lng),Number(trip.destination_lat)];if(coords.some(x=>!Number.isFinite(x)))return reply(200,{estimated_arrival_at:null});
  const useGoogle=Boolean(googleKey)&&body.google_maps===true;
  const slot=await db.rpc('claim_map_request',{p_service:useGoogle?'google_routing':'routing'});if(slot.error||slot.data!==true)return reply(200,{estimated_arrival_at:trip.estimated_arrival_at,eta_updated_at:trip.eta_updated_at});
  let seconds;
  if(useGoogle){
   seconds=await googleDuration(coords);
  }else{
   const routeUrl='https://routing.openstreetmap.de/routed-car/route/v1/driving/'+coords[0].toFixed(5)+','+coords[1].toFixed(5)+';'+coords[2].toFixed(5)+','+coords[3].toFixed(5)+'?overview=false';
   const response=await fetch(routeUrl,{headers:{'User-Agent':'FASTTRIP/1.0 https://fasttripecuador.com'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Ruta no disponible');
   const route=await response.json();seconds=route.routes?.[0]?.duration;if(route.code!=='Ok'||!Number.isFinite(seconds))throw new Error('Ruta no disponible');
  }
  const estimated_arrival_at=new Date(Date.now()+seconds*1000).toISOString();
  const saved=await db.from('trips').update({estimated_arrival_at,eta_updated_at:new Date().toISOString()}).eq('id',trip.id).eq('status','in_progress');if(saved.error)throw saved.error;
  return reply(200,{estimated_arrival_at,eta_updated_at:new Date().toISOString(),remaining_seconds:Math.round(seconds),source:useGoogle?'Google Maps':'OSRM',traffic_included:useGoogle});
 }catch{return reply(503,{message:'No se pudo calcular la ubicación o el tiempo de llegada. Intenta más tarde.'});}
});
