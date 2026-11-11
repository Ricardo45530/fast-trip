export function registrationReviewHandler(service) {
  const origins = new Set(['https://ricardo45530.github.io', 'https://fasttripecuador.com']);
  return async function handle(req) {
    const origin = req.headers.get('origin');
    const headers = {'Content-Type':'application/json', 'Vary':'Origin', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS'};
    if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (status, message, extra = {}) => new Response(JSON.stringify({message,...extra}), {status,headers});
    if (origin && !origins.has(origin)) return reply(403,'Origen no autorizado.');
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (req.method !== 'POST') return reply(405,'Método no permitido.');
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply(401,'Inicia sesión como administrador.');
    try {
      const identity = await service.auth.getUser(token);
      if (identity.error || !identity.data?.user) return reply(401,'La sesión no es válida. Vuelve a iniciar sesión.');
      const reviewer = identity.data.user.id;
      const access = await service.from('profiles').select('role,status').eq('id',reviewer).maybeSingle();
      if (access.error || access.data?.role !== 'admin' || access.data?.status !== 'approved') return reply(403,'Solo Administración aprobada puede revisar solicitudes.');
      let input;
      try { input = await req.json(); } catch { return reply(400,'Solicitud inválida.'); }
      const {request_id,decision} = input;
      if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(request_id || '') || !['approved','rejected'].includes(decision)) return reply(400,'Indica una solicitud y decisión válidas.');
      const result = await service.from('passenger_registration_requests').select('*').eq('id',request_id).maybeSingle();
      if (result.error) throw result.error;
      const registration = result.data;
      if (!registration) return reply(404,'No se encontró la solicitud.');
      if (registration.status !== 'pending') return reply(409,'Esta solicitud ya fue revisada. Actualiza la lista.');
      const review = {status:decision,reviewed_at:new Date().toISOString(),reviewed_by:reviewer};
      if (decision === 'rejected') {
        const rejected = await service.from('passenger_registration_requests').update(review).eq('id',request_id).eq('status','pending').select('id').maybeSingle();
        if (rejected.error) throw rejected.error;
        return rejected.data ? reply(200,'Solicitud rechazada.',{decision}) : reply(409,'La solicitud ya fue revisada.');
      }
      if (!registration.selfie_data_url || !registration.photo_approved_at || !registration.terms_accepted_at) return reply(409,'Falta la selfie aprobada o la aceptación de términos. Pide al pasajero que complete el registro.');
      if(registration.registration_kind==='adolescent' && (input.guardian_verified!==true || !registration.guardian_registration_accepted_at || !registration.guardian_name || !/^[1-9][0-9]{7,14}$/.test(registration.guardian_phone||'') || !['father','mother','guardian'].includes(registration.guardian_relationship))) return reply(409,'Verifica la identidad y representación del padre, madre o representante y los teléfonos de ambos antes de aprobar.');
      const email = registration.email.trim().toLowerCase();
      let account = null;
      for (let page = 1; ; page++) {
        const users = await service.auth.admin.listUsers({page,perPage:200});
        if (users.error) throw users.error;
        account = users.data.users.find(u => u.email?.toLowerCase() === email) || null;
        if (account || users.data.users.length < 200) break;
      }
      let invited = false;
      if (account) {
        const existing = await service.from('profiles').select('role,status').eq('id',account.id).maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data && existing.data.role !== 'passenger') return reply(409,'Ese correo ya pertenece a otro rol. Usa un correo diferente para Pasajeros.');
        if (existing.data && !['pending','approved'].includes(existing.data.status)) return reply(409,'La cuenta está bloqueada o rechazada. Revísala en la lista de pasajeros antes de rehabilitarla.');
      } else {
        const invitation = await service.auth.admin.inviteUserByEmail(email, {data:{full_name:registration.full_name},redirectTo:'https://ricardo45530.github.io/fast-trip/pasajeros/'});
        if (invitation.error || !invitation.data?.user) return reply(502,'No se pudo crear la cuenta y enviar el correo de acceso. La solicitud sigue pendiente; vuelve a intentarlo.');
        account = invitation.data.user;
        invited = true;
      }
      const existing = await service.from('profiles').select('role,status').eq('id',account.id).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data && existing.data.role !== 'passenger') return reply(409,'El correo pertenece a otro rol. No se modificó esa cuenta.');
      if (!existing.data) {
        const created = await service.from('profiles').insert({id:account.id,role:'passenger',status:'pending',full_name:registration.full_name,phone:registration.phone,address:registration.address,national_id:registration.national_id});
        if (created.error) throw created.error;
      }
      if(registration.registration_kind==='adolescent') {
        const guardian=await service.rpc('set_verified_passenger_guardian',{p_passenger_id:account.id,p_registration_id:request_id,p_reviewer:reviewer});
        if(guardian.error||guardian.data!==true) return reply(409,'No se pudo registrar al representante verificado. La cuenta no se habilitará por esta operación.');
      }
      if (existing.data?.status !== 'approved') {
        const approved = await service.from('profiles').update({status:'approved'}).eq('id',account.id).eq('role','passenger').eq('status','pending').select('id').maybeSingle();
        if (approved.error) throw approved.error;
        if (!approved.data) return reply(409,'La cuenta cambió de estado. Actualiza la lista para revisarla.');
      }
      const saved = await service.from('passenger_registration_requests').update(review).eq('id',request_id).eq('status','pending').select('id').maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data) return reply(409,'La solicitud ya fue revisada por otra operación. Actualiza la lista.');
      return reply(200, invited ? 'Pasajero aprobado. Se envió un correo para crear su contraseña.' : 'Pasajero aprobado. Puede iniciar sesión o usar «Crear mi contraseña» en Pasajeros.', {decision,invited});
    } catch (error) {
      console.error('passenger-registration-review failed', error?.code || error?.name || 'unknown');
      return reply(500,'No se pudo completar la revisión. Actualiza la lista e intenta nuevamente; no se cambiará el rol de ninguna cuenta existente.');
    }
  };
}
