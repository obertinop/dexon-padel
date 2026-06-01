// /api/whatsapp/templates.js
// GET  → lista las plantillas APROBADAS de la cuenta (para reabrir conversaciones
//        fuera de la ventana de 24h). Requiere WHATSAPP_WABA_ID.
// POST → envía una plantilla genérica { telefono, name, language?, params:[...] }
// Degrada con gracia: si no está configurado, devuelve { configured:false, templates:[] }.
import {
  graphUrl, TOKEN, checkSecret, sbAdmin, waConfigured, normalizeTel, sendTemplate,
} from "../../lib/whatsapp.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  // ── POST: enviar una plantilla ──
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
      const sb = sbAdmin();
      await sb.from("whatsapp_mensajes").insert({
        de: tel, nombre: "DEXON", mensaje: `📋 Plantilla enviada: ${name}`,
        tipo: "text", meta_id: r.message_id || null, leido: true, direccion: "saliente", estado: "enviado",
      });
    } catch (e) { console.error("[templates] guardar:", e.message); }

    return res.status(200).json({ ok: true, message_id: r.message_id });
  }

  if (req.method !== "GET") return res.status(405).end();

  const WABA_ID = process.env.WHATSAPP_WABA_ID;
  if (!WABA_ID || !TOKEN) {
    return res.status(200).json({ configured: false, templates: [] });
  }

  try {
    const r = await fetch(
      graphUrl(`${WABA_ID}/message_templates?fields=name,status,language,category,components&limit=100`),
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[templates] Meta error:", JSON.stringify(data));
      return res.status(r.status).json({ error: data?.error?.message || "Error", configured: true, templates: [] });
    }
    const templates = (data.data || [])
      .filter((t) => t.status === "APPROVED")
      .map((t) => {
        const body = (t.components || []).find((c) => c.type === "BODY");
        const text = body?.text || "";
        const vars = (text.match(/\{\{\d+\}\}/g) || []).length;
        return { name: t.name, language: t.language, category: t.category, body: text, vars };
      });
    return res.status(200).json({ configured: true, templates });
  } catch (e) {
    console.error("[templates] Error:", e);
    return res.status(500).json({ error: e.message, configured: true, templates: [] });
  }
}
