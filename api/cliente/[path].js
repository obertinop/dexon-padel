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

  const { data: cli } = await client.from("clientes").select("id").eq("telefono", tel).maybeSingle();
  const isNewClient = !cli;
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
        components: [{ type: "body", parameters: [{ type: "text", text: codigo }] }],
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

  let { data: cli } = await client.from("clientes").select("*").eq("telefono", tel).maybeSingle();

  if (!cli) {
    if (!nombre?.trim() || !apellido?.trim()) {
      return res.status(409).json({ error: "Completá nombre y apellido para crear la cuenta.", needsRegistration: true });
    }
    const { data: nuevo, error: cErr } = await client.from("clientes").insert({
      nombre: nombre.trim(), apellido: apellido.trim(), telefono: tel,
      referrer_code: genRefCode(), saldo_favor: 0,
    }).select().single();
    if (cErr) return res.status(500).json({ error: "No se pudo crear el cliente" });
    cli = nuevo;

    if (codigo_referido?.trim()) {
      const { data: refOwner } = await client.from("clientes")
        .select("id").eq("referrer_code", codigo_referido.trim().toUpperCase()).maybeSingle();
      if (refOwner && refOwner.id !== cli.id) {
        await client.from("clientes")
          .update({ referrer_code_used: codigo_referido.trim().toUpperCase() }).eq("id", cli.id);
      }
    }
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

  const ahora = new Date().toISOString();

  const [
    { data: proximas },
    { data: pasadas },
    { data: pagos },
    { data: favoritos },
    { data: abono },
    { data: referidos, count: refCount },
  ] = await Promise.all([
    client.from("turnos").select("*").eq("cliente_id", cliente.id).gte("inicio", ahora).neq("estado", "cancelado").order("inicio", { ascending: true }).limit(20),
    client.from("turnos").select("*").eq("cliente_id", cliente.id).lt("inicio", ahora).order("inicio", { ascending: false }).limit(50),
    client.from("turnos").select("id,inicio,precio,metodo_pago,pagado_en").eq("cliente_id", cliente.id).eq("pagado", true).order("pagado_en", { ascending: false }).limit(50),
    client.from("cliente_favoritos").select("*").eq("cliente_id", cliente.id),
    client.from("abonos").select("*").eq("cliente_id", cliente.id).eq("activo", true).maybeSingle(),
    client.from("clientes").select("id,nombre,apellido,creado_en", { count: "exact" }).eq("referrer_code_used", cliente.referrer_code).order("creado_en", { ascending: false }),
  ]);

  return res.status(200).json({
    cliente: {
      id: cliente.id, nombre: cliente.nombre, apellido: cliente.apellido,
      telefono: cliente.telefono, email: cliente.email,
      referrer_code: cliente.referrer_code, saldo_favor: cliente.saldo_favor || 0,
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
    const horasFalta = (new Date(turno.inicio).getTime() - Date.now()) / 3600000;
    if (horasFalta < HORAS_LIMITE) {
      return res.status(403).json({ error: `Solo podés ${accion} hasta ${HORAS_LIMITE}h antes del turno. Escribinos por WhatsApp.` });
    }
    if (turno.tipo === "abono") {
      return res.status(403).json({ error: "Los turnos de abono se gestionan con el administrador" });
    }
  }

  if (accion === "cancelar") {
    await client.from("turnos").update({ estado: "cancelado", cancelado_en: new Date().toISOString() }).eq("id", turno.id);
    return res.status(200).json({ ok: true });
  }

  if (accion === "reagendar") {
    if (!nuevo_inicio) return res.status(400).json({ error: "Falta nuevo_inicio" });
    const dur = nueva_duracion || turno.duracion || 60;
    const finNuevo = new Date(new Date(nuevo_inicio).getTime() + dur * 60000).toISOString();
    const { data: choque } = await client.from("turnos").select("id")
      .neq("id", turno.id).neq("estado", "cancelado")
      .lt("inicio", finNuevo).gt("fin", nuevo_inicio).limit(1);
    if (choque?.length) return res.status(409).json({ error: "Ese horario ya está ocupado" });
    await client.from("turnos").update({
      inicio: nuevo_inicio, fin: finNuevo,
      reagendado_en: new Date().toISOString(),
      inicio_original: turno.inicio_original || turno.inicio,
    }).eq("id", turno.id);
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

  const { nombre, apellido, email } = req.body || {};
  const campos = {};
  if (nombre?.trim())   campos.nombre   = nombre.trim();
  if (apellido?.trim()) campos.apellido = apellido.trim();
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

  const { desde, hasta } = req.query || {};
  if (!desde || !hasta) return res.status(400).json({ error: "Faltan parámetros desde y hasta" });

  const desdeISO = new Date(desde).toISOString();
  const hastaISO = new Date(hasta).toISOString();

  const [{ data: ocupados }, { data: cfgArr }] = await Promise.all([
    client.from("turnos").select("inicio,fin").neq("estado", "cancelado")
      .gte("inicio", desdeISO).lte("inicio", hastaISO),
    client.from("config").select("hora_inicio,hora_fin,tarifa_base,tarifa_pico,hora_pico_inicio,hora_pico_fin").limit(1),
  ]);

  const cfg = cfgArr?.[0] || { hora_inicio: 10, hora_fin: 24, tarifa_base: 80000, tarifa_pico: 100000, hora_pico_inicio: 19, hora_pico_fin: 22 };
  const ocupadosSet = new Set((ocupados || []).map(t => t.inicio));

  // Generar slots de 1h por día en el rango
  const slots = [];
  const cur = new Date(desdeISO);
  const fin = new Date(hastaISO);
  while (cur <= fin) {
    for (let h = cfg.hora_inicio; h < cfg.hora_fin; h++) {
      const slotISO = new Date(cur);
      slotISO.setHours(h, 0, 0, 0);
      if (slotISO <= new Date()) continue; // no mostrar pasados
      const iso = slotISO.toISOString();
      if (!ocupadosSet.has(iso)) {
        const esPico = h >= cfg.hora_pico_inicio && h < cfg.hora_pico_fin;
        slots.push({ inicio: iso, precio: esPico ? cfg.tarifa_pico : cfg.tarifa_base, esPico });
      }
    }
    cur.setDate(cur.getDate() + 1);
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
