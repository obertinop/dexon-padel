// api/whatsapp/[path].js — catch-all para todas las rutas de WhatsApp
// /api/whatsapp/enviar    → POST enviar template al cliente + notif admin
// /api/whatsapp/media     → GET proxy de descarga de media de Meta
// /api/whatsapp/mensajes  → GET/POST/DELETE gestión de mensajes en DB
// /api/whatsapp/responder → POST enviar mensaje libre y guardarlo
// /api/whatsapp/webhook   → GET verificación / POST mensajes entrantes

import { createClient } from "@supabase/supabase-js";

function sbClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── ENVIAR ───────────────────────────────────────────────────────────────────
async function enviarTemplate(phoneId, token, destino, template) {
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: destino, type: "template", template }),
    });
    const data = await r.json();
    if (!r.ok) { console.error("[whatsapp] Error enviando a", destino, JSON.stringify(data)); return { ok: false, error: data?.error?.message }; }
    return { ok: true, message_id: data?.messages?.[0]?.id };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function handleEnviar(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const secret = process.env.API_SECRET;
  if (secret && req.headers["x-api-secret"] !== secret) return res.status(401).json({ error: "No autorizado" });

  const { tipo, nombre, telefono, fecha, horarios, monto, forma_pago } = req.body || {};
  if (!tipo || !nombre || !telefono) return res.status(400).json({ error: "Faltan datos: tipo, nombre, telefono" });

  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) return res.status(500).json({ error: "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN no configurados" });

  let telCliente = telefono.replace(/\D/g, "");
  if (telCliente.startsWith("0")) telCliente = "595" + telCliente.slice(1);
  if (!telCliente.startsWith("595")) telCliente = "595" + telCliente;

  const resultados = [];
  let templateCliente = null;

  if (tipo === "pago_confirmado" || tipo === "confirmacion_manual") {
    templateCliente = { name: "dexon_pago_confirmado", language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }, { type: "text", text: fecha || "-" }, { type: "text", text: horarios || "-" }, { type: "text", text: monto || "-" }, { type: "text", text: forma_pago || "Pago online" }] }] };
  } else if (tipo === "reprogramacion") {
    templateCliente = { name: "dexon_reprogramacion", language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }, { type: "text", text: fecha || "-" }, { type: "text", text: horarios || "-" }, { type: "text", text: req.body.motivo || "motivos internos" }] }] };
  } else if (tipo === "confirmacion_presencial") {
    templateCliente = { name: "dexon_confirmacion_presencial", language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }, { type: "text", text: fecha || "-" }, { type: "text", text: horarios || "-" }] }] };
  } else if (tipo === "transferencia_pendiente") {
    templateCliente = { name: "dexon_reserva_transferencia", language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: nombre }, { type: "text", text: fecha || "-" }, { type: "text", text: horarios || "-" }, { type: "text", text: monto || "-" }] }] };
  }

  const sb = sbClient();
  if (templateCliente) {
    const r = await enviarTemplate(PHONE_ID, TOKEN, telCliente, templateCliente);
    resultados.push({ destino: "cliente", tel: telCliente, ...r });
    if (r.ok) {
      const textoLegible = (tipo === "pago_confirmado" || tipo === "confirmacion_manual") ? `✅ Reserva confirmada\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💰 ${monto || "-"}\n💳 ${forma_pago || "Pago online"}` : tipo === "confirmacion_presencial" ? `✅ Reserva confirmada (pago en el lugar)\n📅 ${fecha || "-"} a las ${horarios || "-"}` : `⏳ Reserva pendiente\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💰 ${monto || "-"}`;
      try { await sb.from("whatsapp_mensajes").insert({ de: telCliente, nombre, mensaje: textoLegible, tipo: "text", meta_id: r.message_id || null, leido: true, direccion: "saliente" }); } catch (e) { console.error("[enviar] Error guardando en DB:", e.message); }
    }
  }

  try {
    const { data: cfgRows } = await sb.from("config").select("wa_admin_tel").limit(1);
    const adminTel = cfgRows?.[0]?.wa_admin_tel || process.env.WHATSAPP_ADMIN_NOTIFY || "595981086046";
    const metodo = tipo === "pago_confirmado" ? `Pagopar - ${forma_pago || "online"}` : forma_pago || "Transferencia bancaria";
    const textoAdmin = tipo === "reprogramacion" ? `🔄 Turno reprogramado\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || "-"} a las ${horarios || "-"}\n📝 ${req.body.motivo || "-"}` : tipo === "confirmacion_presencial" ? `✅ Turno confirmado (efectivo)\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || "-"} a las ${horarios || "-"}` : `📋 Nueva reserva\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💰 ${monto || "-"}\n💳 ${metodo}`;
    const rAdmin = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ messaging_product: "whatsapp", to: adminTel, type: "text", text: { body: textoAdmin } }) });
    const dataAdmin = await rAdmin.json();
    resultados.push({ destino: "admin", tel: adminTel, ok: rAdmin.ok, error: dataAdmin?.error?.message });
  } catch (e) { resultados.push({ destino: "admin", ok: false, error: e.message }); }

  return res.status(200).json({ ok: true, resultados });
}

// ── MEDIA ────────────────────────────────────────────────────────────────────
async function handleMedia(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id requerido" });
  const TOKEN = process.env.WHATSAPP_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: "WHATSAPP_TOKEN no configurado" });
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!metaRes.ok) { const err = await metaRes.json(); return res.status(metaRes.status).json({ error: err?.error?.message || "Error en Meta API" }); }
    const { url, mime_type } = await metaRes.json();
    const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!fileRes.ok) return res.status(502).json({ error: "No se pudo descargar el archivo" });
    res.setHeader("Content-Type", mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(Buffer.from(await fileRes.arrayBuffer()));
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

// ── MENSAJES ─────────────────────────────────────────────────────────────────
async function handleMensajes(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const sb = sbClient();

  if (req.method === "GET") {
    const limit = parseInt(req.query.limit || "500", 10);
    let q = sb.from("whatsapp_mensajes").select("*").order("created_at", { ascending: true }).limit(limit);
    if (req.query.solo_no_leidos === "true") q = q.eq("leido", false);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }
  if (req.method === "POST") {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids requerido" });
    const { error } = await sb.from("whatsapp_mensajes").update({ leido: true }).in("id", ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const { de } = req.body || {};
    if (!de) return res.status(400).json({ error: "de requerido" });
    const { error } = await sb.from("whatsapp_mensajes").delete().eq("de", de);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).end();
}

// ── RESPONDER ────────────────────────────────────────────────────────────────
async function handleResponder(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { telefono, mensaje, tipo = "texto", media_id, caption } = req.body || {};
  if (!telefono) return res.status(400).json({ error: "telefono requerido" });
  if (tipo === "texto" && !mensaje) return res.status(400).json({ error: "mensaje requerido" });

  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN = process.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) return res.status(500).json({ error: "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN no configurados" });

  let tel = telefono.replace(/\D/g, "");
  if (tel.startsWith("0")) tel = "595" + tel.slice(1);
  if (!tel.startsWith("595")) tel = "595" + tel;

  const msgBody = (tipo === "imagen" && media_id) ? { type: "image", image: { id: media_id, ...(caption ? { caption } : {}) } } : { type: "text", text: { body: mensaje } };

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ messaging_product: "whatsapp", to: tel, ...msgBody }) });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Error enviando mensaje", code: data?.error?.code });
    const metaId = data?.messages?.[0]?.id;
    try { await sbClient().from("whatsapp_mensajes").insert({ de: tel, nombre: "DEXON", mensaje: tipo === "imagen" ? (caption || "[Imagen enviada]") : mensaje, tipo: tipo === "imagen" ? "image" : "text", media_id: media_id || null, meta_id: metaId, leido: true, direccion: "saliente" }); } catch (e) { console.error("[responder] Error guardando:", e); }
    return res.status(200).json({ ok: true, message_id: metaId });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

// ── WEBHOOK ──────────────────────────────────────────────────────────────────
async function enviarWA(phoneId, token, to, texto) {
  const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: texto } }) });
  if (!r.ok) console.error("[webhook] Error Meta API:", JSON.stringify(await r.json().catch(() => ({}))));
  return r;
}

async function handleWebhook(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"], token = req.query["hub.verify_token"], challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).json({ error: "Token de verificación incorrecto" });
  }
  if (req.method !== "POST") return res.status(405).end();

  const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.status(200).json({ ok: true });

  const value = req.body.entry[0].changes[0].value;
  const tipo = message.type || "desconocido";
  const de = message.from, metaId = message.id;
  const nombre = value?.contacts?.[0]?.profile?.name || de;
  let texto = null, mediaId = null;

  switch (tipo) {
    case "text": texto = message.text?.body; break;
    case "audio": mediaId = message.audio?.id; texto = message.audio?.voice ? "[Nota de voz]" : "[Audio]"; break;
    case "image": mediaId = message.image?.id; texto = message.image?.caption || "[Imagen]"; break;
    case "video": mediaId = message.video?.id; texto = message.video?.caption || "[Video]"; break;
    case "document": mediaId = message.document?.id; texto = message.document?.filename || "[Documento]"; break;
    case "sticker": mediaId = message.sticker?.id; texto = "[Sticker]"; break;
    default: texto = `[${tipo}]`;
  }

  const sb = sbClient();
  await sb.from("whatsapp_mensajes").upsert({ de, nombre, mensaje: texto, tipo, meta_id: metaId, media_id: mediaId, leido: false, direccion: "entrante" }, { onConflict: "meta_id", ignoreDuplicates: true });

  const { data: cfgRows } = await sb.from("config").select("wa_bienvenida_activo,wa_bienvenida_texto,wa_admin_tel").limit(1);
  const cfg = cfgRows?.[0] || {};
  const TOKEN = process.env.WHATSAPP_TOKEN, PH_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (TOKEN && PH_ID) {
    const tareas = [];
    if (cfg.wa_bienvenida_activo && cfg.wa_bienvenida_texto) {
      const { count } = await sb.from("whatsapp_mensajes").select("id", { count: "exact", head: true }).eq("de", de).eq("direccion", "entrante").neq("meta_id", metaId);
      if (!count) tareas.push(enviarWA(PH_ID, TOKEN, de, cfg.wa_bienvenida_texto));
    }
    const adminTel = cfg.wa_admin_tel || process.env.WHATSAPP_ADMIN_NOTIFY || "595981086046";
    if (de !== adminTel) tareas.push(enviarWA(PH_ID, TOKEN, adminTel, `📩 Mensaje de ${nombre}:\n${(texto || "").slice(0, 60)}${(texto || "").length > 60 ? "…" : ""}`));
    await Promise.all(tareas);
  }

  return res.status(200).json({ ok: true });
}

// ── ROUTER ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const path = req.query.path;
  if (path === "enviar")    return handleEnviar(req, res);
  if (path === "media")     return handleMedia(req, res);
  if (path === "mensajes")  return handleMensajes(req, res);
  if (path === "responder") return handleResponder(req, res);
  if (path === "webhook")   return handleWebhook(req, res);
  return res.status(404).json({ error: `Ruta whatsapp/${path} no encontrada` });
}
