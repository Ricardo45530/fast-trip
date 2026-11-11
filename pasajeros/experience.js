'use strict';
const passengerExperience=(()=>{
 const VERSION='2026-11-11';
 const memory=new Map();
 const read=key=>{try{return localStorage.getItem(key);}catch{return memory.get(key);}};
 const write=(key,value)=>{memory.set(key,value);try{localStorage.setItem(key,value);}catch{}};
 const parse=(key,fallback)=>{try{return JSON.parse(read(key))??fallback;}catch{return fallback;}};
 const catalog=window.FASTTRIP_LANDSCAPES||[];
 const scenery=document.getElementById('scenery');
 let generation=0;
 function shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
 function nextLandscape(){
  if(!catalog.length)return;
  const thisGeneration=++generation;
  const last=read('fasttrip.landscape.last');
  let bag=parse('fasttrip.landscape.bag',[]).filter(slug=>catalog.some(p=>p.slug===slug));
  if(!bag.length)bag=shuffle(catalog.map(p=>p.slug));
  if(bag[0]===last&&bag.length>1)[bag[0],bag[1]]=[bag[1],bag[0]];
  let attempts=0;
  function tryPhoto(){
   if(thisGeneration!==generation||attempts++>=catalog.length)return;
   if(!bag.length)bag=shuffle(catalog.filter(p=>p.slug!==last).map(p=>p.slug));
   const slug=bag.shift();
   if(slug===last&&catalog.length>1){bag.push(slug);tryPhoto();return;}
   const photo=catalog.find(p=>p.slug===slug);
   if(!photo)return;
   const image=new Image();
   image.onload=()=>{
    if(thisGeneration!==generation)return;
    scenery.style.backgroundImage='url("'+photo.file+'")';
    scenery.style.backgroundPosition=photo.position||'center';
    scenery.classList.add('is-ready');
    document.querySelectorAll('[data-landscape-name]').forEach(el=>el.textContent=photo.label+' · '+photo.region);
    write('fasttrip.landscape.last',slug);write('fasttrip.landscape.bag',JSON.stringify(bag));
   };
   image.onerror=tryPhoto;
   image.src=photo.file;
  }
  tryPhoto();
 }
 const credits=document.getElementById('photoCredits');
 for(const photo of catalog){
  const p=document.createElement('p'),source=document.createElement('a'),license=document.createElement('a');
  source.href=photo.source;source.textContent=photo.label+' — '+photo.author;source.target='_blank';source.rel='noopener noreferrer';
  license.href=photo.licenseUrl||photo.source;license.textContent=photo.license;license.target='_blank';license.rel='noopener noreferrer';
  p.append(source,document.createTextNode(' · '),license,document.createTextNode(' · Tamaño y compresión adaptados para la app.'));credits.append(p);
 }
 nextLandscape();
 return {
  sessionUser:null,nextLandscape,
  termsReceipt:()=>parse('fasttrip.passenger.terms',{}),
  hasAcceptedTerms:()=>parse('fasttrip.passenger.terms',{}).version===VERSION,
  acceptTerms:()=>{write('fasttrip.passenger.terms',JSON.stringify({version:VERSION,acceptedAt:new Date().toISOString()}));write('fasttrip.passenger.returning','yes');},
  markReturning:()=>write('fasttrip.passenger.returning','yes'),
  isReturning:()=>read('fasttrip.passenger.returning')==='yes'
 };
})();
