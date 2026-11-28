'use strict';

window.mountFastTripPlayTest = function ({ role, getClient, show, back, onLogin }) {
 const section = document.getElementById('playTest');
 section.innerHTML = `
  <h2>Prueba de Google Play</h2>
  <p>Para evaluadores mayores de 18 años. Puedes probar viajes entre las dos apps sin cobros.</p>
  <button type="button" data-enter class="hidden">Reintentar</button>
  <p role="status"></p>
  <button type="button" data-back>Volver</button>`;
 const enter = section.querySelector('[data-enter]');
 const status = section.querySelector('[role=status]');
 const route = new URLSearchParams(location.search).get('prueba');
 const direct = route === 'directa';
 const invitation = direct ? '00000000-0000-0000-0000-000000000000' : route;
 const isTestLink = route !== null;
 const storageKey = 'fast-trip-play-test-' + role;
 const invitationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

 function useInvitation(code) {
  const url = new URL(location.href);
  url.searchParams.set('prueba', code);
  url.hash = '';
  location.assign(url);
 }

 if (!isTestLink) {
  for (const selector of ['#access', '#welcome .welcome-bottom']) {
   const container = document.querySelector(selector);
   if (!container) continue;
   const button = document.createElement('button');
   button.type = 'button';
   button.className = 'gold';
   button.textContent = 'Entrar a la prueba';
   button.onclick = () => useInvitation('directa');
   const heading = container.firstElementChild;
   container.insertBefore(button, heading?.matches('h2') ? heading.nextSibling : heading);
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
  show('playTest');
  await enterTest();
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

 async function enterTest() {
  enter.classList.add('hidden');
  enter.disabled = true;
  status.textContent = 'Abriendo la prueba…';
  try {
   if (!invitationPattern.test(invitation)) {
    status.textContent = 'Este enlace de prueba no es válido.';
    return;
   }
   const availability = await getClient().rpc('play_test_invitation_open', { p_invite: invitation });
   if (availability.error) throw new Error('No se pudo verificar el acceso. Vuelve a intentar.');
   if (!availability.data) {
    status.textContent = 'La prueba está cerrada.';
    return;
   }
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
   status.textContent = '';
   await login(device);
  } catch (error) {
   enter.classList.remove('hidden');
   status.textContent = error.message || 'No se pudo abrir la prueba.';
  } finally {
   enter.disabled = false;
  }
 }
 enter.onclick = enterTest;
 section.querySelector('[data-back]').onclick = isTestLink ? () => { location.href = location.pathname; } : back;
 return { open, showStatus };
};
