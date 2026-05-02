// /api/whatsapp/responder.js
// Envía un mensaje (texto o imagen) y lo guarda en whatsapp_mensajes como saliente.
// POST { telefono, mensaje, tipo?, media_id?, caption? }
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { telefono, mensaje, tipo = "texto", media_id, caption } = req.body || {};
  if (!telefono) return res.status(400).json({ error: "telefono requerido" });
  if (tipo === "texto" && !mensaje) return res.status(400).json({ error: "mensaje requerido" });

  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) {
    return res.status(500).json({ error: "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN no configurados" });
  }

  let tel = telefono.replace(/\D/g, "");
  if (tel.startsWith("0")) tel = "595" + tel.slice(1);
  if (!tel.startsWith("595")) tel = "595" + tel;

  const msgBody = (tipo === "imagen" && media_id)
    ? { type: "image", image: { id: media_id, ...(caption ? { caption } : {}) } }
    : { type: "text", text: { body: mensaje } };

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: tel, ...msgBody }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("[responder] Error Meta API:", JSON.stringify(data));
      return res.status(r.status).json({
        error: data?.error?.message || "Error enviando mensaje",
        code: data?.error?.code,
      });
    }

    const metaId = data?.messages?.[0]?.id;
    console.log("[responder] Enviado a", tel, metaId);

    // Guardar en Supabase como mensaje saliente
    try {
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await sb.from("whatsapp_mensajes").insert({
        de:        tel,
        nombre:    "DEXON",
        mensaje:   tipo === "imagen" ? (caption || "[Imagen enviada]") : mensaje,
        tipo:      tipo === "imagen" ? "image" : "text",
        media_id:  media_id || null,
        meta_id:   metaId,
        leido:     true,
        direccion: "saliente",
      });
    } catch (e) {
      console.error("[responder] Error guardando en Supabase:", e);
    }

    return res.status(200).json({ ok: true, message_id: metaId });
  } catch (e) {
    console.error("[responder] Error de red:", e);
    return res.status(500).json({ error: e.message });
  }
}
