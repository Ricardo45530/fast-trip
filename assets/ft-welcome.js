(() => {
const h=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"America/Guayaquil",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
const greeting=h>=5&&h<12?"Buenos días":h>=12&&h<19?"Buenas tardes":"Buenas noches";
const style=document.createElement("style");style.textContent=`
#ft-intro{position:fixed;inset:0;z-index:2147483646;background:radial-gradient(ellipse at 50% 65%,#332718,#080808 65%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#eee;font:16px Arial,sans-serif;text-align:center;overflow:hidden}
#ft-intro .ft-brand{font-size:clamp(40px,12vw,82px);font-weight:900;letter-spacing:2px;animation:ftReveal 1.5s both}
#ft-intro .ft-gold{color:#e6be5d}#ft-intro .ft-silver{color:#dce0e5}
#ft-intro .ft-road{width:min(85%,420px);height:3px;background:linear-gradient(90deg,transparent,#d4af37,transparent);position:relative;margin:24px 0}
#ft-intro .ft-car{position:absolute;top:-42px;left:0;width:100px;animation:ftDrive 2s ease-out both}
#ft-intro .ft-motto{letter-spacing:3px;color:#e6be5d;animation:ftReveal 2s both}
#ft-intro button{margin:12px;padding:10px 18px;border:1px solid #d4af37;background:#181818;color:#fff;border-radius:10px}
@keyframes ftReveal{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ftDrive{from{transform:translateX(-120px);opacity:0}to{transform:translateX(min(55vw,250px));opacity:1}}
@media(prefers-reduced-motion:reduce){#ft-intro *{animation:none!important}}
`;document.head.append(style);
const intro=document.createElement("section");intro.id="ft-intro";intro.setAttribute("aria-label","Bienvenida FAST TRIP");intro.innerHTML='<div class="ft-brand"><span class="ft-gold">FAST</span> <span class="ft-silver">TRIP</span></div><div class="ft-road"><svg class="ft-car" viewBox="0 0 120 45" aria-hidden="true"><path d="M8 29L16 17 34 15 45 4H80L96 17 111 21 116 32H5Z" fill="#161616" stroke="#d4af37" stroke-width="2"/><path d="M40 15 49 7H78L89 15Z" fill="#77818b"/><circle cx="29" cy="32" r="10" fill="#090909" stroke="#d4af37"/><circle cx="94" cy="32" r="10" fill="#090909" stroke="#d4af37"/><path d="M106 22h10" stroke="#fff5bf" stroke-width="3"/></svg></div><div class="ft-motto">LO HACEMOS DIFERENTE</div><h2></h2><p>Bienvenidos a FAST TRIP</p><div><button type="button" data-voice>Escuchar bienvenida</button><button type="button" data-skip>Continuar</button></div>';
intro.querySelector("h2").textContent=greeting;document.body.append(intro);
let timer=setTimeout(close,6500),spoken=false;
function close(){clearTimeout(timer);intro.remove();if("speechSynthesis" in window)window.speechSynthesis.cancel();}
function speak(){if(!("speechSynthesis" in window)||spoken)return;const u=new SpeechSynthesisUtterance(greeting+". Bienvenidos a Fast Trip. Lo hacemos diferente.");u.lang="es-EC";u.rate=.9;const voices=speechSynthesis.getVoices();const v=voices.find(x=>x.lang==="es-EC")||voices.find(x=>x.lang==="es-US")||voices.find(x=>x.lang.startsWith("es"));if(v)u.voice=v;u.onstart=()=>{spoken=true;clearTimeout(timer);timer=setTimeout(close,12000)};u.onend=()=>{if(spoken)close()};u.onerror=()=>{};speechSynthesis.speak(u);}
intro.querySelector("[data-voice]").onclick=()=>{if("speechSynthesis" in window)speechSynthesis.cancel();spoken=false;speak()};intro.querySelector("[data-skip]").onclick=close;speak();
})();