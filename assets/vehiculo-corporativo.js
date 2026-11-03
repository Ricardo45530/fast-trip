// FAST TRIP — composición corporativa de fotografías de unidades.
// La imagen de entrada debe ser un recorte PNG/WebP con transparencia.
// La eliminación del fondo requiere un procesador separado y no debe
// confundirse con este módulo de composición.
export async function crearFotoCorporativa(recorteUrl, numeroUnidad, opciones = {}) {
  if (!/^QRZ [0-9]{3,}$/.test(numeroUnidad)) throw new Error('Número QRZ inválido');
  const cargar = url => new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = () => reject(new Error('No se pudo cargar la fotografía'));
    img.src = url;
  });
  const foto = await cargar(recorteUrl);
  const w = 1080, h = 1080;
  const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
  const c=canvas.getContext('2d');
  const fondo=c.createLinearGradient(0,0,w,h);
  fondo.addColorStop(0,'#080808'); fondo.addColorStop(.65,'#22201a'); fondo.addColorStop(1,'#080808');
  c.fillStyle=fondo;c.fillRect(0,0,w,h);
  c.strokeStyle='#b9923f';c.lineWidth=7;
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(540,570,470+i*35,240+i*45,-.18,Math.PI,Math.PI*2);c.stroke();}
  c.fillStyle='#d8b85f';c.textAlign='center';c.font='bold 76px Arial';c.fillText('FAST',400,135);
  c.fillStyle='#d7d7d7';c.fillText('TRIP',685,135);
  c.fillStyle='#e4c779';c.font='bold 28px Arial';c.fillText('LO HACEMOS DIFERENTE',540,190);
  const maxW=960,maxH=660,scale=Math.min(maxW/foto.width,maxH/foto.height);
  c.drawImage(foto,540-foto.width*scale/2,220+(maxH-foto.height*scale)/2,foto.width*scale,foto.height*scale);
  c.fillStyle='#0b0b0b';c.fillRect(0,900,w,180);
  c.strokeStyle='#c69c42';c.lineWidth=5;c.beginPath();c.moveTo(0,900);c.lineTo(w,900);c.stroke();
  c.fillStyle='#e5c16b';c.font='bold 90px Arial';c.fillText(numeroUnidad,540,1010);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo exportar la imagen')),'image/png'));
}
