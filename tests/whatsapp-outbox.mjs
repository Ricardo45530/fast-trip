import assert from 'node:assert/strict';
import {outboxHandler} from '../supabase/functions/process-whatsapp-outbox/handler.js';
const token='a'.repeat(64);
function setup({recent=true,code=0,throws=false,auth=true,rows=true,fallback=false}={}){
 const updates=[],payloads=[];
 const service={rpc:async n=>({data:n==='whatsapp_worker_authorized'?auth:rows?[{id:'synthetic',recipient_phone:'593990000000',attempts:1,template_parameters:{text:'Actualización de prueba'}}]:[],error:null}),from(table){let values;const q={select(){return q},eq(){return q},order(){return q},limit(){return q},update(v){values=v;return q},then(resolve){if(values)updates.push(values);return Promise.resolve({data:table==='whatsapp_incoming_messages'?(recent?[{received_at:new Date().toISOString()}]:[]):[],error:null}).then(resolve)}};return q}};
 const handler=outboxHandler(service,()=> 'mock-token',async(url,options)=>{payloads.push(JSON.parse(options.body));if(throws)throw Error('timeout');const fail=code||fallback&&payloads.length===1&&131047;return Response.json(fail?{error:{code:fail}}:{messages:[{id:'synthetic-provider-message'}]},{status:fail?400:200});});
 return {updates,payloads,handler};
}
const request=(key=token)=>new Request('https://example.invalid',{method:'POST',headers:{'x-worker-token':key}});
{const t=setup();assert.equal((await t.handler(request('bad'))).status,401);assert.equal(t.payloads.length,0)}
{const t=setup({auth:false});assert.equal((await t.handler(request())).status,401);assert.equal(t.payloads.length,0)}
{const t=setup();assert.equal((await t.handler(request())).status,200);assert.equal(t.payloads[0].type,'text');assert.equal(t.updates[0].status,'sent');assert.equal(t.updates[0].provider_status,'accepted')}
{const t=setup({recent:false});await t.handler(request());assert.equal(t.payloads[0].type,'template');assert.equal(t.payloads[0].template.name,'fast_trip_actualizacion')}
{const t=setup({recent:false,code:132001});await t.handler(request());assert.equal(t.updates[0].status,'blocked');assert.equal(t.updates[0].attempts,0)}
{const t=setup({throws:true});await t.handler(request());assert.equal(t.updates[0].status,'uncertain');assert.equal(t.payloads.length,1)}
{const t=setup({rows:false});await t.handler(request());assert.equal(t.payloads.length,0)}
{const t=setup({fallback:true});await t.handler(request());assert.equal(t.payloads.length,2);assert.equal(t.payloads[1].type,'template');assert.equal(t.updates[0].status,'sent')}
console.log('8 outbox tests passed: authentication, session window, template fallback, blocked template, uncertain delivery and empty claims. Meta/database mocked; no messages sent.');
