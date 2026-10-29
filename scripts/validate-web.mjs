import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
const apps=['conductor','pasajeros'];let failures=0;
for(const app of apps){
  const htmlPath=`${app}/index.html`,manifestPath=`${app}/manifest.webmanifest`;
  if(!existsSync(htmlPath)){console.error('Falta '+htmlPath);failures++;continue;}
  const html=readFileSync(htmlPath,'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
  if(!scripts.length){console.error('No hay JavaScript inline en '+htmlPath);failures++;}
  for(const [i,js] of scripts.entries()){try{new Script(js,{filename:htmlPath+'#script'+(i+1)});}catch(e){console.error('Error JS en '+htmlPath+' (bloque '+(i+1)+'): '+(e.stack||e.message));failures++;}}
  if(!existsSync(manifestPath)){console.error('Falta '+manifestPath);failures++;continue;}
  try{const m=JSON.parse(readFileSync(manifestPath,'utf8'));for(const field of ['name','start_url','display'])if(!m[field])throw Error('Falta '+field);}catch(e){console.error('Manifiesto inválido '+manifestPath+': '+e.message);failures++;}
  console.log('Revisado: '+app+' ('+scripts.length+' bloque(s) JavaScript, manifiesto válido)');
}
if(failures)process.exit(1);
console.log('Comprobación básica de HTML/JS y manifiestos superada. No reemplaza pruebas Android ni de seguridad.');
