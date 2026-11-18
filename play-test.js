'use strict';

window.mountFastTripPlayTest = function ({ role, getClient, show, back, onLogin }) {
 const section = document.getElementById('playTest');
 section.innerHTML = `
  <h2>Prueba cerrada de FAST TRIP</h2>
  <p>Esta prueba es para mayores de 18 años. Usa el mismo dispositivo para consultar tu aprobación. Los viajes de prueba se hacen sin cobros.</p>
  <form>
   <label>Nombre completo<input name="fullName" autocomplete="name" required minlength="2" maxlength="100"></label>
   <label>Número de celular<input name="phone" type="tel" autocomplete="tel" required maxlength="24" placeholder="09XXXXXXXX"></label>
   <button type="submit">Enviar solicitud de prueba</button>
  </form>
  <button type="button" data-resume class="hidden">Consultar aprobación</button>
  <p role="status"></p>
  <button type="button" data-back>Volver</button>`;
 const form = section.querySelector('form');
 const submit = form.querySelector('button');
 const resume = section.querySelector('[data-resume]');
 const status = section.querySelector('[role=status]');
 const storageKey = 'fast-trip-play-test-' + role;

 function readDevice() {
  try { return JSON.parse(localStorage.getItem(storageKey)); }
  catch { return null; }
 }

 function render() {
  const registered = readDevice()?.registered === true;
  form.classList.toggle('hidden', registered);
  resume.classList.toggle('hidden', !registered);
 }

 async function open(regular) {
  const result = await getClient()?.rpc('play_test_is_open');
  if (!result || result.error) throw new Error('No se pudo consultar el registro. Revisa tu conexión y vuelve a intentar.');
  if (!result.data) return regular();
  render();
  show('playTest');
 }

 function showStatus(accountStatus) {
  render();
  show('playTest');
  status.textContent = {
   pending: 'Solicitud enviada. Administración debe aprobar tu registro. Pulsa «Consultar aprobación» después.',
   suspended: 'La cuenta de prueba está suspendida. Si la prueba sigue abierta, consulta a Administración.',
   rejected: 'Administración rechazó tu solicitud de prueba.'
  }[accountStatus] || 'No pudimos consultar tu solicitud de prueba.';
 }

 async function login(device) {
  const email = 'play-test-' + device.key + '@example.com';
  const session = await getClient().auth.getSession();
  if (session.data?.session?.user.email !== email) {
   const { error } = await getClient().auth.signInWithPassword({ email, password: device.password });
   if (error) throw new Error('No se pudo abrir tu acceso de prueba. Vuelve a intentar.');
  }
  await onLogin();
 }

 form.onsubmit = async event => {
  event.preventDefault();
  const fields = new FormData(form);
  const name = fields.get('fullName').trim();
  const phone = fields.get('phone').trim().replace(/[()\s-]/g, '').replace(/^\+?593/, '0');
  if (name.length < 2 || !/^09\d{8}$/.test(phone)) {
   status.textContent = 'Escribe tu nombre y un número de celular ecuatoriano válido.';
   return;
  }
  submit.disabled = true;
  status.textContent = 'Enviando solicitud…';
  try {
   const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name + '\n' + phone));
   const signature = Array.from(new Uint8Array(hash)).join(',');
   let device = readDevice();
   if (device?.signature !== signature) {
    device = { key: crypto.randomUUID(), password: crypto.randomUUID() + crypto.randomUUID(), signature };
    localStorage.setItem(storageKey, JSON.stringify(device));
   }
   const result = await getClient().functions.invoke('play-test-enrollment', {
    body: { key: device.key, password: device.password, role, name, phone }
   });
   if (result.error) {
    const body = await result.error.context?.json?.()?.catch(() => null);
    throw new Error(body?.message || 'No se pudo enviar la solicitud. Vuelve a intentar.');
   }
   device.registered = true;
   delete device.signature;
   localStorage.setItem(storageKey, JSON.stringify(device));
   form.reset();
   render();
   await login(device);
  } catch (error) {
   status.textContent = error.message || 'No se pudo enviar la solicitud.';
  } finally {
   submit.disabled = false;
  }
 };
 resume.onclick = async () => {
  resume.disabled = true;
  status.textContent = 'Consultando aprobación…';
  try { await login(readDevice()); }
  catch (error) { status.textContent = error.message; }
  finally { resume.disabled = false; }
 };
 section.querySelector('[data-back]').onclick = back;
 return { open, showStatus };
};
