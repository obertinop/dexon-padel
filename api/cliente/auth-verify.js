// /api/cliente/auth-verify.js
// Verifica el OTP de 6 dígitos y devuelve un token de sesión.
// Si el cliente no existía y vinieron nombre/apellido en el body, lo creamos.
//
// Body: { telefono, codigo, nombre?, apellido?, codigo_referido? }
// Response: { ok: true, token, cliente: {...} }

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_INTENTOS    = 5;
const SESSION_DIAS    = 30;

function normalizarTel(raw) {
  let t = (raw || "").replace(/\D/g, "");
  if (!t) return null;
  if (t.startsWith("0")) t = "595" + t.slice(1);
  if (!t.startsWith("595")) t = "595" + t;
  return t.length < 11 ? null : t;
}

function genRefCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "REF-";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { telefono, codigo, nombre, apellido, codigo_referido } = req.body || {};
  const tel = normalizarTel(telefono);
  if (!tel || !/^\d{6}$/.test(codigo || "")) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Buscar el OTP más reciente para ese teléfono, no usado, no vencido
  const { data: otp } = await sb
    .from("otp_codes")
    .select("*")
    .eq("telefono", tel)
    .eq("usado", false)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return res.status(400).json({ error: "Código vencido o inexistente. Pedí uno nuevo." });

  if (otp.intentos >= MAX_INTENTOS) {
    return res.status(429).json({ error: "Demasiados intentos. Pedí un código nuevo." });
  }

  if (otp.codigo !== codigo) {
    await sb.from("otp_codes").update({ intentos: otp.intentos + 1 }).eq("id", otp.id);
    return res.status(401).json({ error: "Código incorrecto" });
  }

  // Marcar OTP usado
  await sb.from("otp_codes").update({ usado: true }).eq("id", otp.id);

  // Buscar cliente
  let { data: cli } = await sb
    .from("clientes")
    .select("*")
    .eq("telefono", tel)
    .maybeSingle();

  // Crear cliente si no existe — requiere nombre + apellido en el body
  if (!cli) {
    if (!nombre?.trim() || !apellido?.trim()) {
      return res.status(409).json({ error: "Cliente no encontrado. Completá nombre y apellido para crear la cuenta.", needsRegistration: true });
    }
    const { data: nuevo, error: cErr } = await sb.from("clientes").insert({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: tel,
      referrer_code: genRefCode(),
      saldo_favor: 0,
    }).select().single();

    if (cErr) {
      console.error("[auth-verify] create cliente error:", cErr);
      return res.status(500).json({ error: "No se pudo crear el cliente" });
    }
    cli = nuevo;

    // Acreditar referido si vino code
    if (codigo_referido?.trim()) {
      const { data: refOwner } = await sb
        .from("clientes")
        .select("id")
        .eq("referrer_code", codigo_referido.trim().toUpperCase())
        .maybeSingle();
      if (refOwner && refOwner.id !== cli.id) {
        // Acreditar 20.000 al referente al primer turno pagado — aquí solo lo guardamos
        await sb.from("clientes").update({ referrer_code_used: codigo_referido.trim().toUpperCase() }).eq("id", cli.id);
      }
    }
  }

  // Generar token de sesión
  const token = crypto.randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + SESSION_DIAS * 24 * 3600 * 1000);

  await sb.from("cliente_sessions").insert({
    cliente_id: cli.id,
    token,
    expira_en: expira.toISOString(),
    ip: req.headers["x-forwarded-for"] || null,
    user_agent: req.headers["user-agent"] || null,
  });

  await sb.from("clientes").update({ ultimo_acceso: new Date().toISOString() }).eq("id", cli.id);

  return res.status(200).json({
    ok: true,
    token,
    expira_en: expira.toISOString(),
    cliente: {
      id: cli.id,
      nombre: cli.nombre,
      apellido: cli.apellido,
      telefono: cli.telefono,
      email: cli.email || null,
      referrer_code: cli.referrer_code,
      saldo_favor: cli.saldo_favor || 0,
    },
  });
}
