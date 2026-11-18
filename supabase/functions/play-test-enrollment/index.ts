import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const origin = "https://ricardo45530.github.io";
const headers = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const respond = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return respond(405, "Método no disponible.");

  try {
    const body = await request.text();
    if (body.length > 1500) return respond(400, "Solicitud inválida.");
    const { key, role, name, phone, password } = JSON.parse(body);
    if (typeof key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key) ||
        (role !== "driver" && role !== "passenger") ||
        typeof name !== "string" || name !== name.trim() || name.length < 2 || name.length > 100 ||
        typeof phone !== "string" || !/^09\d{8}$/.test(phone) ||
        typeof password !== "string" || !/^[0-9a-f-]{72}$/.test(password)) {
      return respond(400, "Escribe tu nombre y un celular ecuatoriano válido.");
    }

    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const url = Deno.env.get("SUPABASE_URL")!;
    const server = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);
    const reserved = await server.rpc("reserve_play_test_enrollment", {
      p_key: key, p_role: role, p_name: name, p_phone: phone,
    });
    if (reserved.error) return respond(503, "No se pudo guardar. Vuelve a intentar.");
    if (!reserved.data) return respond(409, "No se pudo registrar este celular. Revisa si ya lo usaste o si la prueba sigue abierta.");

    const email = "play-test-" + key + "@example.com";
    const created = await server.auth.admin.createUser({
      email, password, email_confirm: true, app_metadata: { fast_trip_play_test: role },
    });
    let user = created.data.user;
    if (!user) {
      const login = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);
      user = (await login.auth.signInWithPassword({ email, password })).data.user;
    }
    if (!user || user.app_metadata.fast_trip_play_test !== role) {
      return respond(503, "No se pudo preparar tu acceso. Vuelve a intentar.");
    }
    const finished = await server.rpc("finish_play_test_enrollment", { p_key: key, p_user_id: user.id });
    if (finished.error || !finished.data) return respond(503, "No se pudo completar el registro. Vuelve a intentar.");
    return respond(200, "Registro de prueba completado.");
  } catch {
    return respond(400, "No se pudo procesar la solicitud.");
  }
});
