// /api/whatsapp/upload.js
// Sube un archivo a Meta y devuelve un media_id reutilizable para enviarlo.
// POST { data: "<base64>", mime: "image/jpeg", filename?: "foto.jpg" }
// El panel luego llama a /api/whatsapp/responder con { tipo:"imagen", media_id }.
// Límite práctico ~4MB (límite de body de Vercel).
import { graphUrl, PHONE_ID, TOKEN, checkSecret, waConfigured } from "../../lib/whatsapp.js";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });
  if (!waConfigured()) return res.status(500).json({ error: "WhatsApp no configurado" });

  const { data, mime, filename } = req.body || {};
  if (!data || !mime) return res.status(400).json({ error: "data y mime requeridos" });

  try {
    const base64 = data.includes(",") ? data.split(",")[1] : data; // soporta data URLs
    const buffer = Buffer.from(base64, "base64");

    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mime);
    form.append("file", new Blob([buffer], { type: mime }), filename || "archivo");

    const r = await fetch(graphUrl(`${PHONE_ID}/media`), {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    });
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
