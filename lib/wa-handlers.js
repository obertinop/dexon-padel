// lib/wa-handlers.js
// Handlers de los endpoints de WhatsApp, despachados por api/whatsapp/[action].js.
// Viven fuera de /api para NO contar como funciones serverless (límite del plan).
import {
  sbAdmin, waConfigured, normalizeTel, checkSecret,
  sendText, sendMedia, sendReaction, sendTemplate, markRead,
  graphUrl, PHONE_ID, TOKEN, ADMIN_TEL,
} from "./whatsapp.js";

const cors = (res, methods) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
};

// ── /api/whatsapp/mensajes ──────────────────────────────────────────────────
export async function mensajes(req, res) {
  cors(res, "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  const sb = sbAdmin();

  if (req.method === "GET") {
    const limit = parseInt(req.query.limit || "500", 10);
    const soloNoLeidos = req.query.solo_no_leidos === "true";
    let q = sb.from("whatsapp_mensajes").select("*").order("created_at", { ascending: false }).limit(limit);
    if (soloNoLeidos) q = q.eq("leido", false);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json((data || []).reverse());
  }

  if (req.method === "POST") {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids requerido" });
    const { error } = await sb.from("whatsapp_mensajes").update({ leido: true }).in("id", ids);
    if (error) return res.status(500).json({ error: error.message });
    if (waConfigured()) {
      try {
        const { data } = await sb.from("whatsapp_mensajes").select("meta_id")
          .in("id", ids).eq("direccion", "entrante").order("created_at", { ascending: false }).limit(1);
        if (data?.[0]?.meta_id) await markRead(data[0].meta_id);
      } catch (e) { console.error("[mensajes] markRead:", e.message); }
    }
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

// ── /api/whatsapp/responder ─────────────────────────────────────────────────
const TIPO_DB = { imagen: "image", documento: "document", audio: "audio", video: "video" };
const windowCode = (r) => (r.code === 131047 || r.code === 470 || r.code === 131051 ? "window_closed" : undefined);

export async function responder(req, res) {
  cors(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  const { telefono, mensaje, tipo = "texto", media_id, caption, context_message_id, emoji } = req.body || {};
  if (!telefono) return res.status(400).json({ error: "telefono requerido" });
  if (!waConfigured()) return res.status(500).json({ error: "WhatsApp no configurado" });

  const tel = normalizeTel(telefono);
  const sb = sbAdmin();

  if (tipo === "reaccion") {
    if (!context_message_id) return res.status(400).json({ error: "context_message_id requerido" });
    const r = await sendReaction(tel, context_message_id, emoji);
    if (!r.ok) return res.status(r.status || 500).json({ error: r.error || "Error", code: windowCode(r) });
    await sb.from("whatsapp_mensajes").update({ reaccion: emoji || null }).eq("meta_id", context_message_id);
    return res.status(200).json({ ok: true });
  }

  const esMedia = !!TIPO_DB[tipo];
  if (!esMedia && !mensaje) return res.status(400).json({ error: "mensaje requerido" });
  if (esMedia && !media_id) return res.status(400).json({ error: "media_id requerido" });

  const { data: ult } = await sb.from("whatsapp_mensajes").select("created_at")
    .eq("de", tel).eq("direccion", "entrante").order("created_at", { ascending: false }).limit(1);
  const last = ult?.[0]?.created_at;
  const windowOpen = last && Date.now() - new Date(last).getTime() < 24 * 3600 * 1000;
  if (!windowOpen) {
    return res.status(403).json({ error: "La ventana de 24h está cerrada. Enviá una plantilla aprobada para reabrir la conversación.", code: "window_closed" });
  }

  const r = esMedia
    ? await sendMedia(tel, TIPO_DB[tipo], media_id, caption, context_message_id)
    : await sendText(tel, mensaje, context_message_id);
  if (!r.ok) return res.status(r.status || 500).json({ error: r.error || "Error enviando mensaje", code: windowCode(r) });

  try {
    await sb.from("whatsapp_mensajes").insert({
      de: tel, nombre: "DEXON",
      mensaje: esMedia ? caption || `[${tipo}]` : mensaje,
      tipo: esMedia ? TIPO_DB[tipo] : "text",
      media_id: media_id || null, meta_id: r.message_id || null,
      replied_to: context_message_id || null, leido: true, direccion: "saliente", estado: "enviado",
    });
  } catch (e) { console.error("[responder] guardar:", e); }

  return res.status(200).json({ ok: true, message_id: r.message_id });
}

// ── /api/whatsapp/upload ────────────────────────────────────────────────────
export async function upload(req, res) {
  cors(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });
  if (!waConfigured()) return res.status(500).json({ error: "WhatsApp no configurado" });

  const { data, mime, filename } = req.body || {};
  if (!data || !mime) return res.status(400).json({ error: "data y mime requeridos" });

  try {
    const base64 = data.includes(",") ? data.split(",")[1] : data;
    const buffer = Buffer.from(base64, "base64");
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mime);
    form.append("file", new Blob([buffer], { type: mime }), filename || "archivo");
    const r = await fetch(graphUrl(`${PHONE_ID}/media`), { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[upload] Meta error:", JSON.stringify(out));
      return res.status(r.status).json({ error: out?.error?.message || "Error subiendo archivo" });
    }
    return res.status(200).json({ media_id: out.id });
  } catch (e) {
    console.error("[upload] Error:", e);
    return res.status(500).json({ error: e.message });
  }
}

// ── /api/whatsapp/templates ─────────────────────────────────────────────────
export async function templates(req, res) {
  cors(res, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  if (req.method === "POST") {
    const { telefono, name, language = "es", params = [] } = req.body || {};
    if (!telefono || !name) return res.status(400).json({ error: "telefono y name requeridos" });
    if (!waConfigured()) return res.status(500).json({ error: "WhatsApp no configurado" });
    const tel = normalizeTel(telefono);
    const template = {
      name, language: { code: language },
      ...(params.length ? { components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: String(t ?? "-") })) }] } : {}),
    };
    const r = await sendTemplate(tel, template);
    if (!r.ok) return res.status(r.status || 500).json({ error: r.error || "Error enviando plantilla" });
    try {
      await sbAdmin().from("whatsapp_mensajes").insert({
        de: tel, nombre: "DEXON", mensaje: `📋 Plantilla enviada: ${name}`,
        tipo: "text", meta_id: r.message_id || null, leido: true, direccion: "saliente", estado: "enviado",
      });
    } catch (e) { console.error("[templates] guardar:", e.message); }
    return res.status(200).json({ ok: true, message_id: r.message_id });
  }

  if (req.method !== "GET") return res.status(405).end();

  const WABA_ID = process.env.WHATSAPP_WABA_ID;
  if (!WABA_ID || !TOKEN) return res.status(200).json({ configured: false, templates: [] });

  try {
    const r = await fetch(graphUrl(`${WABA_ID}/message_templates?fields=name,status,language,category,components&limit=100`), { headers: { Authorization: `Bearer ${TOKEN}` } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[templates] Meta error:", JSON.stringify(data));
      return res.status(r.status).json({ error: data?.error?.message || "Error", configured: true, templates: [] });
    }
    const lista = (data.data || []).filter((t) => t.status === "APPROVED").map((t) => {
      const body = (t.components || []).find((c) => c.type === "BODY");
      const text = body?.text || "";
      return { name: t.name, language: t.language, category: t.category, body: text, vars: (text.match(/\{\{\d+\}\}/g) || []).length };
    });
    return res.status(200).json({ configured: true, templates: lista });
  } catch (e) {
    console.error("[templates] Error:", e);
    return res.status(500).json({ error: e.message, configured: true, templates: [] });
  }
}

// ── /api/whatsapp/enviar (plantillas de confirmación) ───────────────────────
function buildTemplate(tipo, { nombre, fecha, horarios, monto, forma_pago, motivo }) {
  const body = (...vals) => [{ type: "body", parameters: vals.map((text) => ({ type: "text", text: String(text ?? "-") })) }];
  switch (tipo) {
    case "pago_confirmado":
    case "confirmacion_manual":
      return { name: "dexon_pago_confirmado", language: { code: "es" }, components: body(nombre, fecha, horarios, monto, forma_pago || "Pago online") };
    case "reprogramacion":
      return { name: "dexon_reprogramacion", language: { code: "es" }, components: body(nombre, fecha, horarios, motivo || "motivos internos") };
    case "confirmacion_presencial":
      return { name: "dexon_confirmacion_presencial", language: { code: "es" }, components: body(nombre, fecha, horarios) };
    case "transferencia_pendiente":
      return { name: "dexon_reserva_transferencia", language: { code: "es" }, components: body(nombre, fecha, horarios, monto) };
    default: return null;
  }
}

export async function enviar(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  const { tipo, nombre, telefono, fecha, horarios, monto, forma_pago } = req.body || {};
  if (!tipo || !nombre || !telefono) return res.status(400).json({ error: "Faltan datos: tipo, nombre, telefono" });
  if (!waConfigured()) return res.status(500).json({ error: "WhatsApp no configurado" });

  const telCliente = normalizeTel(telefono);
  const sb = sbAdmin();
  const resultados = [];

  const templateCliente = buildTemplate(tipo, { nombre, fecha, horarios, monto, forma_pago, motivo: req.body.motivo });
  if (templateCliente) {
    const r = await sendTemplate(telCliente, templateCliente);
    resultados.push({ destino: "cliente", tel: telCliente, ...r });
    if (r.ok) {
      const textoLegible =
        tipo === "pago_confirmado" || tipo === "confirmacion_manual"
          ? `✅ Reserva confirmada\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💰 ${monto || "-"}\n💳 ${forma_pago || "Pago online"}`
          : tipo === "confirmacion_presencial"
          ? `✅ Reserva confirmada (pago en el lugar)\n📅 ${fecha || "-"} a las ${horarios || "-"}`
          : `⏳ Reserva pendiente de confirmación\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💰 ${monto || "-"}`;
      try {
        await sb.from("whatsapp_mensajes").insert({ de: telCliente, nombre, mensaje: textoLegible, tipo: "text", meta_id: r.message_id || null, leido: true, direccion: "saliente", estado: "enviado" });
      } catch (e) { console.error("[enviar] guardar:", e.message); }
    }
  }

  try {
    const { data: cfgRows } = await sb.from("config").select("wa_admin_tel").limit(1);
    const adminTel = cfgRows?.[0]?.wa_admin_tel || ADMIN_TEL;
    const metodo = tipo === "pago_confirmado" ? `Pagopar - ${forma_pago || "online"}` : forma_pago || "Transferencia bancaria";
    const textoAdmin =
      tipo === "reprogramacion"
        ? `🔄 Turno reprogramado\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || "-"} a las ${horarios || "-"}\n📝 Motivo: ${req.body.motivo || "-"}`
        : tipo === "confirmacion_presencial"
        ? `✅ Turno confirmado (pago en el lugar)\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💵 Efectivo al llegar`
        : `📋 Nueva reserva\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || "-"} a las ${horarios || "-"}\n💰 ${monto || "-"}\n💳 ${metodo}`;
    const rAdmin = await sendText(adminTel, textoAdmin);
    resultados.push({ destino: "admin", tel: adminTel, ok: rAdmin.ok, error: rAdmin.error });
  } catch (e) {
    console.error("[enviar] notif admin:", e.message);
    resultados.push({ destino: "admin", ok: false, error: e.message });
  }

  return res.status(200).json({ ok: true, resultados });
}

// ── /api/whatsapp/media (proxy de descarga) ─────────────────────────────────
export async function media(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id requerido" });
  if (!TOKEN) return res.status(500).json({ error: "WHATSAPP_TOKEN no configurado" });

  try {
    const metaRes = await fetch(graphUrl(id), { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      return res.status(metaRes.status).json({ error: err?.error?.message || "Error en Meta API" });
    }
    const { url, mime_type } = await metaRes.json();
    const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!fileRes.ok) return res.status(502).json({ error: "No se pudo descargar el archivo" });
    res.setHeader("Content-Type", mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    const buffer = await fileRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (e) {
    console.error("[media] Error:", e);
    return res.status(500).json({ error: e.message });
  }
}
