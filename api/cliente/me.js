// /api/cliente/me.js
// Devuelve los datos completos del cliente autenticado:
// perfil, turnos próximos/pasados, abono activo, pagos, favoritos, stats de referidos.
//
// Header: Authorization: Bearer <token>
// Response: { cliente, proximas[], pasadas[], pagos[], favoritos[], abono, referidos[] }

import { createClient } from "@supabase/supabase-js";

export async function autenticarCliente(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { error: "Sin token" };

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: sess } = await sb
    .from("cliente_sessions")
    .select("*, clientes(*)")
    .eq("token", token)
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();
  if (!sess) return { error: "Sesión inválida o expirada" };

  // Bump last_seen
  await sb.from("cliente_sessions").update({ last_seen: new Date().toISOString() }).eq("id", sess.id);
  return { cliente: sess.clientes, sb };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, sb, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const ahora = new Date().toISOString();

  // Turnos próximos
  const { data: proximas } = await sb
    .from("turnos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .gte("inicio", ahora)
    .neq("estado", "cancelado")
    .order("inicio", { ascending: true })
    .limit(20);

  // Turnos pasados
  const { data: pasadas } = await sb
    .from("turnos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .lt("inicio", ahora)
    .order("inicio", { ascending: false })
    .limit(50);

  // Pagos — derivados de los turnos pagados
  const { data: pagos } = await sb
    .from("turnos")
    .select("id, inicio, precio, metodo_pago, pagado_en")
    .eq("cliente_id", cliente.id)
    .eq("pagado", true)
    .order("pagado_en", { ascending: false })
    .limit(50);

  // Favoritos
  const { data: favoritos } = await sb
    .from("cliente_favoritos")
    .select("*")
    .eq("cliente_id", cliente.id);

  // Abono activo
  const { data: abono } = await sb
    .from("abonos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("activo", true)
    .maybeSingle();

  // Referidos = clientes con referrer_code_used = cliente.referrer_code
  const { data: referidos, count: refCount } = await sb
    .from("clientes")
    .select("id, nombre, apellido, creado_en", { count: "exact" })
    .eq("referrer_code_used", cliente.referrer_code)
    .order("creado_en", { ascending: false });

  return res.status(200).json({
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      telefono: cliente.telefono,
      email: cliente.email,
      referrer_code: cliente.referrer_code,
      saldo_favor: cliente.saldo_favor || 0,
      notif: {
        recordatorio: cliente.notif_recordatorio ?? true,
        promo: cliente.notif_promo ?? false,
        email_resumen: cliente.notif_email_resumen ?? false,
        sms_urgente: cliente.notif_sms_urgente ?? true,
      },
    },
    proximas: proximas || [],
    pasadas: pasadas || [],
    pagos: pagos || [],
    favoritos: favoritos || [],
    abono: abono || null,
    referidos: { total: refCount || 0, lista: referidos || [] },
  });
}
