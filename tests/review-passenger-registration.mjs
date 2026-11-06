import assert from 'node:assert/strict';
import {registrationReviewHandler} from '../supabase/functions/review-passenger-registration/handler.js';
const id='11111111-1111-4111-8111-111111111111';
function setup(options={}){
 const rows={profiles:[{id:'admin',role:'admin',status:'approved'},...(options.profile?[options.profile]:[])],passenger_registration_requests:[{id,email:'passenger@example.invalid',full_name:'Test passenger',phone:'0990000000',address:'Test address',national_id:'0000000000',status:'pending',selfie_data_url:'data:image/jpeg;base64,/9j/test',photo_approved_at:'2026-11-05T23:00:00Z',terms_accepted_at:'2026-11-05T23:00:00Z'}]};
 const calls={invites:0};
 const service={auth:{getUser:async()=>({data:{user:{id:options.actor||'admin'}}}),admin:{listUsers:async()=>({data:{users:options.account?[options.account]:[]}}),inviteUserByEmail:async()=>{calls.invites++;return {data:{user:{id:'passenger',email:'passenger@example.invalid'}}};}}},from(table){
  let op='select',value,filters=[];
  const execute=()=>{let data=rows[table].filter(r=>filters.every(([k,v])=>r[k]===v));if(op==='update')data.forEach(r=>Object.assign(r,value));if(op==='insert'){rows[table].push(value);data=[value];}return {data,error:null};};
  const q={select(){return q},eq(k,v){filters.push([k,v]);return q},update(v){op='update';value=v;return q},insert(v){op='insert';value=v;return q},async maybeSingle(){const r=execute();return {...r,data:r.data[0]||null}},then(resolve,reject){return Promise.resolve(execute()).then(resolve,reject)}};return q;
 }};return {handle:registrationReviewHandler(service),rows,calls};
}
function req(body={request_id:id,decision:'approved'},token='valid'){return new Request('https://example.invalid',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});}
{
 const t=setup();assert.equal((await t.handle(req(undefined,null))).status,401);assert.equal(t.calls.invites,0);
}
{
 const t=setup({actor:'driver',profile:{id:'driver',role:'driver',status:'approved'}});assert.equal((await t.handle(req())).status,403);assert.equal(t.calls.invites,0);
}
{
 const t=setup();assert.equal((await t.handle(req({request_id:'wrong',decision:'approved'}))).status,400);assert.equal(t.calls.invites,0);
}
{
 const t=setup({account:{id:'driver',email:'passenger@example.invalid'},profile:{id:'driver',role:'driver',status:'approved'}});assert.equal((await t.handle(req())).status,409);assert.equal(t.rows.profiles[1].role,'driver');assert.equal(t.rows.passenger_registration_requests[0].status,'pending');assert.equal(t.calls.invites,0);
}
{
 const t=setup();assert.equal((await t.handle(req({request_id:id,decision:'rejected'}))).status,200);assert.equal(t.rows.passenger_registration_requests[0].status,'rejected');assert.equal(t.calls.invites,0);assert.equal(t.rows.profiles.length,1);
}
{
 const t=setup();const response=await t.handle(req());assert.equal(response.status,200);assert.equal(t.calls.invites,1);assert.equal(t.rows.profiles.find(p=>p.id==='passenger').status,'approved');assert.equal(t.rows.passenger_registration_requests[0].status,'approved');assert.equal((await t.handle(req())).status,409);assert.equal(t.calls.invites,1);
}
{
 const t=setup({account:{id:'passenger',email:'passenger@example.invalid'},profile:{id:'passenger',role:'passenger',status:'pending'}});assert.equal((await t.handle(req())).status,200);assert.equal(t.calls.invites,0);assert.equal(t.rows.profiles[1].status,'approved');
}
{
 const t=setup({account:{id:'passenger',email:'passenger@example.invalid'},profile:{id:'passenger',role:'passenger',status:'suspended'}});assert.equal((await t.handle(req())).status,409);assert.equal(t.rows.profiles[1].status,'suspended');
}
console.log('8 review tests passed: authentication, authorization, input, role preservation, rejection, approval, retries and blocked accounts. No emails sent.');
