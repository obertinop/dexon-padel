// /api/cliente/[path].js
// Punto de entrada unificado para todos los endpoints del portal "Mi cuenta".
// Rutas manejadas (req.query.path):
//   POST   auth-send        — envía OTP por WhatsApp
//   POST   auth-verify      — verifica OTP, devuelve token de sesión
//   GET    me               — datos completos del cliente
//   POST   turno-accion     — reagendar / cancelar turno
//   PATCH  perfil           — editar nombre, apellido, email
//   PATCH  notif            — preferencias de notificación
//   POST   favoritos        — agregar horario favorito
//   DELETE favoritos        — borrar horario favorito (?id=)
//   GET    disponibilidad   — slots libres en rango de fechas

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── SUPABASE ────────────────────────────────────────────────────
function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── AUTH MIDDLEWARE ─────────────────────────────────────────────
async function autenticarCliente(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { error: "Sin token" };

  const client = sb();
  const { data: sess } = await client
    .from("cliente_sessions")
    .select("*, clientes(*)")
    .eq("token", token)
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();
  if (!sess) return { error: "Sesión inválida o expirada" };

  await client.from("cliente_sessions").update({ last_seen: new Date().toISOString() }).eq("id", sess.id);
  return { cliente: sess.clientes, client };
}

// ── UTILS ───────────────────────────────────────────────────────
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

// ── HANDLERS ────────────────────────────────────────────────────

async function handleAuthSend(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { telefono } = req.body || {};
  const tel = normalizarTel(telefono);
  if (!tel) return res.status(400).json({ error: "Teléfono inválido" });

  const client = sb();

  const { data: reciente } = await client
    .from("otp_codes")
    .select("creado_en")
    .eq("telefono", tel)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reciente) {
    const ageSec = (Date.now() - new Date(reciente.creado_en).getTime()) / 1000;
    if (ageSec < 60) {
      return res.status(429).json({ error: `Esperá ${Math.ceil(60 - ageSec)}s para reenviar` });
    }
  }

  const telNorm9s = tel.replace(/^595/, "").slice(-9);
  const formatosSend = [...new Set([tel, `0${telNorm9s}`, `595${telNorm9s}`, telNorm9s])];
  let cliExiste = null;
  for (const fmt of formatosSend) {
    const { data } = await client.from("clientes").select("id").eq("telefono", fmt).maybeSingle();
    if (data) { cliExiste = data; break; }
  }
  const isNewClient = !cliExiste;
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const expira = new Date(Date.now() + 5 * 60 * 1000);

  const { error: insErr } = await client.from("otp_codes").insert({
    telefono: tel, codigo, expira_en: expira.toISOString(),
    ip: req.headers["x-forwarded-for"] || null,
  });
  if (insErr) return res.status(500).json({ error: "No se pudo generar el código" });

  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) return res.status(500).json({ error: "WhatsApp no configurado" });

  const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: tel,
      type: "template",
      template: {
        name: "dexon_codigo",
        language: { code: "es" },
        components: [
          { type: "body", parameters: [{ type: "text", text: codigo }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] },
        ],
      },
    }),
  });
  if (!r.ok) {
    const d = await r.json();
    const errCode = d?.error?.code;
    const errMsg  = d?.error?.message;
    const errData = d?.error?.error_data?.details;
    console.error("[auth-send] WA error code:", errCode);
    console.error("[auth-send] WA error msg:", errMsg);
    if (errData) console.error("[auth-send] WA error details:", errData);
    return res.status(500).json({ error: "No se pudo enviar el código por WhatsApp", wa_code: errCode, wa_msg: errMsg });
  }

  return res.status(200).json({ ok: true, isNewClient, expira_en: expira.toISOString() });
}

async function handleAuthVerify(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { telefono, codigo, nombre, apellido, codigo_referido } = req.body || {};
  const tel = normalizarTel(telefono);
  if (!tel || !/^\d{6}$/.test(codigo || "")) return res.status(400).json({ error: "Datos inválidos" });

  const client = sb();

  const { data: otp } = await client
    .from("otp_codes")
    .select("*")
    .eq("telefono", tel)
    .eq("usado", false)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return res.status(400).json({ error: "Código vencido o inexistente. Pedí uno nuevo." });
  if (otp.intentos >= 5) return res.status(429).json({ error: "Demasiados intentos. Pedí un código nuevo." });

  if (otp.codigo !== codigo) {
    await client.from("otp_codes").update({ intentos: otp.intentos + 1 }).eq("id", otp.id);
    return res.status(401).json({ error: "Código incorrecto" });
  }

  await client.from("otp_codes").update({ usado: true }).eq("id", otp.id);

  // Buscar por múltiples formatos: 595XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX
  const telNorm9 = tel.replace(/^595/, "").slice(-9);
  const formatos = [...new Set([tel, `0${telNorm9}`, `595${telNorm9}`, telNorm9])];
  let cli = null;
  for (const fmt of formatos) {
    const { data } = await client.from("clientes").select("*").eq("telefono", fmt).maybeSingle();
    if (data) { cli = data; break; }
  }

  if (!cli) {
    if (!nombre?.trim()) {
      return res.status(409).json({ error: "Completá tu nombre para crear la cuenta.", needsRegistration: true });
    }
    const nombreCompleto = apellido?.trim() ? `${nombre.trim()} ${apellido.trim()}` : nombre.trim();
    const { data: nuevo, error: cErr } = await client.from("clientes").insert({
      nombre: nombreCompleto, telefono: tel,
      referrer_code: genRefCode(), saldo_favor: 0,
    }).select().single();
    if (cErr) return res.status(500).json({ error: "No se pudo crear el cliente" });
    cli = nuevo;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await client.from("cliente_sessions").insert({
    cliente_id: cli.id, token, expira_en: expira.toISOString(),
    ip: req.headers["x-forwarded-for"] || null,
    user_agent: req.headers["user-agent"] || null,
  });
  await client.from("clientes").update({ ultimo_acceso: new Date().toISOString() }).eq("id", cli.id);

  return res.status(200).json({
    ok: true, token, expira_en: expira.toISOString(),
    cliente: {
      id: cli.id, nombre: cli.nombre, apellido: cli.apellido,
      telefono: cli.telefono, email: cli.email || null,
      referrer_code: cli.referrer_code, saldo_favor: cli.saldo_favor || 0,
    },
  });
}

async function handleMe(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, client, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const hoy = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Adds a computed `inicio` ISO string and `pagado` alias so the frontend
  // can use turno.inicio for dates/times (DB stores fecha + hora separately).
  const enrichTurnos = (arr) => (arr || []).map(t => ({
    ...t,
    inicio: t.fecha ? `${t.fecha}T${String(t.hora || 0).padStart(2, "0")}:00:00` : null,
    pagado: t.cobrado,
  }));

  const [
    { data: proximasRaw },
    { data: pasadasRaw },
    { data: pagosRaw },
    { data: favoritos },
    { data: abono },
    { data: referidos, count: refCount },
    { data: cfgArr },
  ] = await Promise.all([
    client.from("turnos").select("*").eq("cliente_id", cliente.id).gte("fecha", hoy).neq("estado", "cancelado").order("fecha", { ascending: true }).order("hora", { ascending: true }).limit(20),
    client.from("turnos").select("*").eq("cliente_id", cliente.id).lt("fecha", hoy).order("fecha", { ascending: false }).order("hora", { ascending: false }).limit(50),
    client.from("turnos").select("id,fecha,hora,precio,metodo_pago,created_at").eq("cliente_id", cliente.id).eq("cobrado", true).order("created_at", { ascending: false }).limit(50),
    client.from("cliente_favoritos").select("*").eq("cliente_id", cliente.id),
    client.from("abonos").select("*").eq("cliente_id", cliente.id).eq("estado", "activo").maybeSingle(),
    client.from("turnos").select("id,fecha,hora,cliente_id", { count: "exact" }).eq("applied_referral_code", cliente.referrer_code || ""),
    client.from("config").select("referral_discount_percent").limit(1),
  ]);

  const proximas = enrichTurnos(proximasRaw);
  const pasadas = enrichTurnos(pasadasRaw);
  const pagos = enrichTurnos(pagosRaw);

  return res.status(200).json({
    cliente: {
      id: cliente.id, nombre: cliente.nombre, apellido: cliente.apellido || "",
      telefono: cliente.telefono, email: cliente.email,
      referrer_code: cliente.referrer_code, saldo_favor: cliente.saldo_favor || 0,
      notif: {
        recordatorio: cliente.notif_recordatorio ?? true,
        promo: cliente.notif_promo ?? false,
        email_resumen: cliente.notif_email_resumen ?? false,
        sms_urgente: cliente.notif_sms_urgente ?? true,
      },
    },
    proximas,
    pasadas,
    pagos,
    favoritos: favoritos || [],
    abono: abono || null,
    referidos: { total: refCount || 0, lista: referidos || [] },
    ref_pct: Number(cfgArr?.[0]?.referral_discount_percent) || 10,
  });
}

async function handleTurnoAccion(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, client, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const { accion, turno_id, nuevo_inicio, nueva_duracion } = req.body || {};
  if (!accion || !turno_id) return res.status(400).json({ error: "Faltan datos" });

  const { data: turno } = await client.from("turnos").select("*")
    .eq("id", turno_id).eq("cliente_id", cliente.id).maybeSingle();
  if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

  const HORAS_LIMITE = 12;

  if (accion === "cancelar" || accion === "reagendar") {
    const turnoISO = `${turno.fecha}T${String(turno.hora).padStart(2, "0")}:00:00`;
    const horasFalta = (new Date(turnoISO).getTime() - Date.now()) / 3600000;
    if (horasFalta < HORAS_LIMITE) {
      return res.status(403).json({ error: `Solo podés ${accion} hasta ${HORAS_LIMITE}h antes del turno. Escribinos por WhatsApp.` });
    }
    if (turno.tipo === "abono") {
      return res.status(403).json({ error: "Los turnos de abono se gestionan con el administrador" });
    }
  }

  if (accion === "cancelar") {
    await client.from("turnos").update({ estado: "cancelado" }).eq("id", turno.id);
    return res.status(200).json({ ok: true });
  }

  if (accion === "reagendar") {
    if (!nuevo_inicio) return res.status(400).json({ error: "Falta nuevo_inicio" });
    const nuevaFecha = nuevo_inicio.slice(0, 10);
    const nuevaHora = Number(nuevo_inicio.slice(11, 13));
    const { data: choque } = await client.from("turnos").select("id")
      .neq("id", turno.id).neq("estado", "cancelado")
      .eq("fecha", nuevaFecha).eq("hora", nuevaHora).limit(1);
    if (choque?.length) return res.status(409).json({ error: "Ese horario ya está ocupado" });
    await client.from("turnos").update({ fecha: nuevaFecha, hora: nuevaHora }).eq("id", turno.id);
    return res.status(200).json({ ok: true });
  }

  if (accion === "pagar") {
    return res.status(501).json({ error: "Implementar redirección a /api/pagopar/crear-pago" });
  }

  return res.status(400).json({ error: "Acción no soportada" });
}

async function handlePerfil(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, client, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const { nombre, email } = req.body || {};
  const campos = {};
  if (nombre?.trim()) campos.nombre = nombre.trim();
  if (email !== undefined) campos.email = email?.trim() || null;

  if (Object.keys(campos).length === 0) return res.status(400).json({ error: "Nada para actualizar" });

  const { error: upErr } = await client.from("clientes").update(campos).eq("id", cliente.id);
  if (upErr) return res.status(500).json({ error: "No se pudo actualizar el perfil" });

  return res.status(200).json({ ok: true });
}

async function handleNotif(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, client, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const { recordatorio, promo, email_resumen, sms_urgente } = req.body || {};
  const campos = {};
  if (recordatorio  !== undefined) campos.notif_recordatorio    = Boolean(recordatorio);
  if (promo         !== undefined) campos.notif_promo           = Boolean(promo);
  if (email_resumen !== undefined) campos.notif_email_resumen   = Boolean(email_resumen);
  if (sms_urgente   !== undefined) campos.notif_sms_urgente     = Boolean(sms_urgente);

  if (Object.keys(campos).length === 0) return res.status(400).json({ error: "Nada para actualizar" });

  const { error: upErr } = await client.from("clientes").update(campos).eq("id", cliente.id);
  if (upErr) return res.status(500).json({ error: "No se pudo guardar las preferencias" });

  return res.status(200).json({ ok: true });
}

async function handleFavoritos(req, res) {
  const { cliente, client, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  if (req.method === "POST") {
    const { dia_semana, hora, duracion, label } = req.body || {};
    if (dia_semana === undefined || !hora) return res.status(400).json({ error: "Faltan día y hora" });
    const dia = Number(dia_semana);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) return res.status(400).json({ error: "dia_semana debe ser 0-6" });

    const { data, error: insErr } = await client.from("cliente_favoritos").insert({
      cliente_id: cliente.id, dia_semana: dia, hora: hora.trim(),
      duracion: Number(duracion) || 60, label: label?.trim() || null,
    }).select().single();
    if (insErr) return res.status(500).json({ error: "No se pudo guardar el favorito" });
    return res.status(201).json({ ok: true, favorito: data });
  }

  if (req.method === "DELETE") {
    const id = Number(req.query?.id);
    if (!id) return res.status(400).json({ error: "Falta id" });
    const { data: fav } = await client.from("cliente_favoritos").select("id")
      .eq("id", id).eq("cliente_id", cliente.id).maybeSingle();
    if (!fav) return res.status(404).json({ error: "Favorito no encontrado" });
    await client.from("cliente_favoritos").delete().eq("id", id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método no permitido" });
}

async function handleDisponibilidad(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, client, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const fecha = (req.query.fecha || req.query.desde || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: "Falta parámetro fecha (YYYY-MM-DD)" });

  const [{ data: ocupados }, { data: cfgArr }] = await Promise.all([
    client.from("turnos").select("hora").neq("estado", "cancelado").eq("fecha", fecha),
    client.from("config").select("hora_inicio,hora_fin,tarifa_base,tarifa_pico,hora_pico_inicio,hora_pico_fin").limit(1),
  ]);

  const cfg = cfgArr?.[0] || { hora_inicio: 10, hora_fin: 24, tarifa_base: 80000, tarifa_pico: 100000, hora_pico_inicio: 19, hora_pico_fin: 22 };
  const ocupadas = new Set((ocupados || []).map(t => Number(t.hora)));
  const ahoraMs = Date.now();

  const slots = [];
  for (let h = Number(cfg.hora_inicio); h < Number(cfg.hora_fin); h++) {
    if (ocupadas.has(h)) continue;
    if (new Date(`${fecha}T${String(h).padStart(2, "0")}:00:00Z`).getTime() <= ahoraMs) continue;
    const esPico = h >= Number(cfg.hora_pico_inicio) && h < Number(cfg.hora_pico_fin);
    slots.push({
      inicio: `${fecha}T${String(h).padStart(2, "0")}:00:00`,
      precio: esPico ? Number(cfg.tarifa_pico) : Number(cfg.tarifa_base),
      esPico,
    });
  }

  return res.status(200).json({ slots });
}

// ── ROUTER PRINCIPAL ────────────────────────────────────────────
export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const ruta = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;

  switch (ruta) {
    case "auth-send":    return handleAuthSend(req, res);
    case "auth-verify":  return handleAuthVerify(req, res);
    case "me":           return handleMe(req, res);
    case "turno-accion": return handleTurnoAccion(req, res);
    case "perfil":       return handlePerfil(req, res);
    case "notif":        return handleNotif(req, res);
    case "favoritos":    return handleFavoritos(req, res);
    case "disponibilidad": return handleDisponibilidad(req, res);
    default:             return res.status(404).json({ error: "Ruta no encontrada" });
  }
}
