export function summarizeForecast(raw,now=new Date()){
 const updated=Date.parse(raw?.properties?.meta?.updated_at);if(!Number.isFinite(updated)||now.getTime()-updated>12*3600000)throw new Error('Pronóstico desactualizado');
 const hours=(raw.properties.timeseries||[]).filter(p=>{const t=Date.parse(p.time);return t>=now.getTime()-3600000&&t<=now.getTime()+6*3600000;});if(!hours.length)throw new Error('No hay horas vigentes');
 const wet=hours.filter(p=>(p.data.next_1_hours?.details?.precipitation_amount||0)>=.2).length;
 const storm=hours.some(p=>String(p.data.next_1_hours?.summary?.symbol_code||'').includes('thunder'));
 const temp=Math.round(hours[0].data.instant.details.air_temperature);
 const forecast=storm?'posibles lluvias con tormenta':wet>=4?'lluvias durante varias de las próximas horas':wet?'posibilidad de lluvia':'cielos variables, sin lluvia destacada en las próximas horas';
 const date=new Intl.DateTimeFormat('es-EC',{timeZone:'America/Guayaquil',day:'numeric',month:'long'}).format(now);
 const advice=(wet||storm)?'Recuerda llevar paraguas, salir con tiempo y viajar con calma.':'Planifica tu salida con tiempo, mantente hidratado y disfruta del camino.';
 return `Hola. Hoy, ${date}, en Guayaquil, el pronóstico indica ${forecast}, con una temperatura cercana a ${temp} grados. ${advice} Fast Trip. Lo hacemos diferente.`;
}
