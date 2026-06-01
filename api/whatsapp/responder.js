// /api/whatsapp/responder.js
// Envía un mensaje saliente (texto, media o reacción) y lo guarda en whatsapp_mensajes.
// POST { telefono, mensaje, tipo?, media_id?, caption?, context_message_id?, emoji? }
//   tipo: "texto" (default) | "imagen" | "documento" | "audio" | "video" | "reaccion"
//
// Respeta la ventana de 24h: fuera de ella, Meta sólo acepta plantillas → se
// devuelve { error, code:"window_closed" } para que el panel ofrezca una plantilla.
import {
  sbAdmin, waConfigured, normalizeTel, checkSecret,
  sendText, sendMedia, sendReaction,
} from "../../lib/whatsapp.js";

const TIPO_DB = { imagen: "image", documento: "document", audio: "audio", video: "video" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  const { telefono, mensaje, tipo = "texto", media_id, caption, context_message_id, emoji } = req.body || {};
  if (!telefono) return res.status(400).json({ error: "telefono requerido" });
  if (!waConfigured()) return res.status(500).json({ error: "WhatsApp no configurado" });

  const tel = normalizeTel(telefono);
  const sb = sbAdmin();

  // ── Reacción (no es un mensaje, actualiza el mensaje objetivo) ──
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

  // ── Ventana de 24h ──
  const { data: ult } = await sb
    .from("whatsapp_mensajes").select("created_at")
    .eq("de", tel).eq("direccion", "entrante")
    .order("created_at", { ascending: false }).limit(1);
  const last = ult?.[0]?.created_at;
  const windowOpen = last && Date.now() - new Date(last).getTime() < 24 * 3600 * 1000;
  if (!windowOpen) {
    return res.status(403).json({
      error: "La ventana de 24h está cerrada. Enviá una plantilla aprobada para reabrir la conversación.",
      code: "window_closed",
    });
  }

  // ── Envío ──
  const r = esMedia
    ? await sendMedia(tel, TIPO_DB[tipo], media_id, caption, context_message_id)
    : await sendText(tel, mensaje, context_message_id);

  if (!r.ok) {
    return res.status(r.status || 500).json({ error: r.error || "Error enviando mensaje", code: windowCode(r) });
  }

  // ── Guardar como saliente ──
  try {
    await sb.from("whatsapp_mensajes").insert({
      de: tel,
      nombre: "DEXON",
      mensaje: esMedia ? caption || `[${tipo}]` : mensaje,
      tipo: esMedia ? TIPO_DB[tipo] : "text",
      media_id: media_id || null,
      meta_id: r.message_id || null,
      replied_to: context_message_id || null,
      leido: true,
      direccion: "saliente",
      estado: "enviado",
    });
  } catch (e) {
    console.error("[responder] Error guardando en Supabase:", e);
  }

  return res.status(200).json({ ok: true, message_id: r.message_id });
}

// Códigos de error de Meta cuando la ventana de 24h está cerrada.
function windowCode(r) {
  return r.code === 131047 || r.code === 470 || r.code === 131051 ? "window_closed" : undefined;
}
