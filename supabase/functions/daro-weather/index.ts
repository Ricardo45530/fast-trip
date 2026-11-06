import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {createRemoteJWKSet,jwtVerify} from 'npm:jose@5.9.6';
import { Buffer } from 'node:buffer';
import { summarizeForecast } from './weather.js';
const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const publicKey='sb_publishable_JNcWc4KR76hOSqe9mvs9Tw_Vu4XOicE';
const origins=new Set(['https://ricardo45530.github.io','https://fasttripecuador.com','https://www.fasttripecuador.com']);
let inflight:Promise<Record<string,unknown>>|null=null;
const githubKeys=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
async function forecast(){
 const now=new Date();const cached=await service.from('daro_weather_cache').select('data,expires_at').eq('key','guayaquil').maybeSingle();
 let data=cached.data?.data||{},expires=Date.parse(cached.data?.expires_at||'');let raw=data.raw;
 if(!raw||!Number.isFinite(expires)||expires<=now.getTime()){
  const response=await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-2.1962&lon=-79.8862',{headers:{'User-Agent':'FASTTRIP/1.0 https://fasttripecuador.com'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('No se pudo consultar el pronóstico');raw=await response.json();
  expires=Math.max(now.getTime()+30*60000,Date.parse(response.headers.get('expires')||'')||0);
 }
 const text=summarizeForecast(raw,now);let audio=data.text===text?data.audio_base64:null;
 const generated_at=now.toISOString();
 const saved=await service.from('daro_weather_cache').upsert({key:'guayaquil',data:{raw,text,audio_base64:audio,audio_attempted_at:data.audio_attempted_at,generated_at},expires_at:new Date(expires).toISOString()},{onConflict:'key'});if(saved.error)throw saved.error;
 return {text,audio_base64:audio,generated_at,forecast_updated_at:raw.properties.meta.updated_at,source:'MET Norway',city:'Guayaquil'};
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin'),headers:Record<string,string>={'content-type':'application/json','vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{message:'Origen no autorizado'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{message:'Método no permitido'});
 // This public, fixed-city forecast endpoint accepts the app's public API key.
 // It accepts no passenger data, coordinates, or arbitrary text for synthesis.
 if(req.headers.get('apikey')!==publicKey)return reply(401,{message:'Clave de aplicación requerida'});
 let input:any;try{input=await req.json();}catch{return reply(400,{message:'Solicitud inválida'});}
 if(input.action==='publish_audio'){
  try{
   const verified=await jwtVerify(String(input.token||''),githubKeys,{issuer:'https://token.actions.githubusercontent.com',audience:'fasttrip-daro-weather'});
   const p=verified.payload;
   if(p.repository_id!=='1424037247'||p.sub!=='repo:Ricardo45530/fast-trip:ref:refs/heads/main'||p.workflow_ref!=='Ricardo45530/fast-trip/.github/workflows/daro-weather-audio.yml@refs/heads/main')return reply(403,{message:'Publicación no autorizada'});
   if(typeof input.audio_base64!=='string'||input.audio_base64.length<1000||input.audio_base64.length>1000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.audio_base64))return reply(400,{message:'Audio inválido'});
   const cached=await service.from('daro_weather_cache').select('data').eq('key','guayaquil').single();
   if(cached.error||cached.data.data.text!==input.text)return reply(409,{message:'El pronóstico cambió; vuelve a generarlo'});
   const saved=await service.from('daro_weather_cache').update({data:{...cached.data.data,audio_base64:input.audio_base64,audio_voice:'es-EC-LuisNeural',voice_updated_at:new Date().toISOString()}}).eq('key','guayaquil');
   if(saved.error)throw saved.error;return reply(200,{message:'Voz del pronóstico actualizada'});
  }catch{return reply(403,{message:'La firma de publicación no es válida'});}
 }
 try{if(!inflight)inflight=forecast().finally(()=>{inflight=null;});return reply(200,await inflight);}catch{return reply(503,{message:'El pronóstico actualizado no está disponible. Intenta más tarde.'});}
});
