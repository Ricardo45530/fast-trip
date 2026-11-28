'use strict';

window.mountFastTripPlayTest = function ({ role, getClient, show, back, onLogin }) {
 const section = document.getElementById('playTest');
 section.innerHTML = `
  <h2>Prueba de Google Play</h2>
  <p>Para evaluadores mayores de 18 años. Puedes probar viajes entre las dos apps sin cobros.</p>
  <button type="button" data-enter class="hidden">Entrar a la prueba</button>
  <p role="status"></p>
  <button type="button" data-back>Volver</button>`;
 const enter = section.querySelector('[data-enter]');
 const status = section.querySelector('[role=status]');
 const invitation = new URLSearchParams(location.search).get('prueba');
 const isTestLink = invitation !== null;
 const storageKey = 'fast-trip-play-test-' + role;
 const invitationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

 function useInvitation(code) {
  const url = new URL(location.href);
  url.searchParams.set('prueba', code);
  url.hash = '';
  location.assign(url);
 }

 function addInvitationEntry(container, before = null) {
  const entry = document.createElement('details');
  entry.className = 'ft-play-test-entry';
  entry.innerHTML = '<summary>Entrar a prueba de Google Play</summary><button type="button" data-continue class="hidden">Continuar prueba</button><form><label>Código de prueba<input name="invite" required autocomplete="off" autocapitalize="none" spellcheck="false"></label><button type="submit">Abrir acceso de prueba</button></form>';
  const saved = readSavedDevice();
  if (saved?.registered && invitationPattern.test(saved.invitation)) {
   const continueButton = entry.querySelector('[data-continue]');
   continueButton.classList.remove('hidden');
   continueButton.onclick = () => useInvitation(saved.invitation);
  }
  const form = entry.querySelector('form');
  const input = form.elements.namedItem('invite');
  input.addEventListener('input', () => input.setCustomValidity(''));
  form.onsubmit = event => {
   event.preventDefault();
   const code = input.value.trim();
   if (!invitationPattern.test(code)) {
    input.setCustomValidity('Copia el código completo de tu correo de invitación, incluidos los guiones.');
    input.reportValidity();
    return;
   }
   useInvitation(code);
  };
  container.insertBefore(entry, before);
 }
 if (!isTestLink) {
  const style = document.createElement('style');
  style.textContent = `
   .ft-play-test-entry{margin:12px 0;color:#f4db9a}
   .ft-play-test-entry summary{padding:12px;border:1px solid #b99545;border-radius:10px;background:#d4af37;color:#161109;text-align:center;cursor:pointer}
   .ft-play-test-entry summary{font-weight:700}
   .ft-play-test-entry form{padding:8px 0}
  `;
  document.head.append(style);
  for (const selector of ['#access', '#welcome .welcome-bottom', '#terms', '#registration']) {
   const container = document.querySelector(selector);
   if (container) {
    const heading = container.firstElementChild;
    addInvitationEntry(container, heading?.matches('h2') ? heading.nextSibling : container.firstChild);
   }
  }
 }

 function readSavedDevice() {
  try { return JSON.parse(localStorage.getItem(storageKey)); }
  catch { return null; }
 }

 function readDevice() {
  const device = readSavedDevice();
  return device?.invitation === invitation ? device : null;
 }

 async function open(regular) {
  if (!isTestLink) return regular();
  const result = invitationPattern.test(invitation)
   ? await getClient()?.rpc('play_test_invitation_open', { p_invite: invitation })
   : null;
  show('playTest');
  enter.classList.toggle('hidden', !result?.data);
  status.textContent = result?.data ? '' : result?.error
   ? 'No se pudo verificar el acceso. Vuelve a intentar.'
   : 'Este código de prueba ya no está activo.';
 }

 function showStatus(accountStatus) {
  show('playTest');
  status.textContent = {
   pending: 'Todavía estamos preparando el acceso. Vuelve a intentar en unos instantes.',
   suspended: 'La cuenta de prueba está suspendida. Si la prueba sigue abierta, consulta a Administración.',
   rejected: 'Administración rechazó el acceso de prueba.'
  }[accountStatus] || 'No pudimos consultar tu acceso de prueba.';
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

 enter.onclick = async () => {
  enter.disabled = true;
  status.textContent = 'Abriendo la prueba…';
  try {
   let device = readDevice();
   if (!device?.registered) {
    // An older unfinished registration used a name and needs a new key.
    if (!device || device.signature) {
     device = { key: crypto.randomUUID(), password: crypto.randomUUID() + crypto.randomUUID(), invitation };
     localStorage.setItem(storageKey, JSON.stringify(device));
    }
    const result = await getClient().functions.invoke('play-test-enrollment', {
     body: { key: device.key, password: device.password, role, invitation }
    });
    if (result.error) {
     const body = await result.error.context?.json?.()?.catch(() => null);
     throw new Error(body?.message || 'No se pudo preparar el acceso. Vuelve a intentar.');
    }
    device.registered = true;
    localStorage.setItem(storageKey, JSON.stringify(device));
   }
   await login(device);
  } catch (error) {
   status.textContent = error.message || 'No se pudo abrir la prueba.';
  } finally {
   enter.disabled = false;
  }
 };
 section.querySelector('[data-back]').onclick = isTestLink ? () => { location.href = location.pathname; } : back;
 return { open, showStatus };
};
