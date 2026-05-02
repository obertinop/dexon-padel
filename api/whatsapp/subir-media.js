// /api/whatsapp/subir-media.js
// Recibe una imagen en base64 desde el frontend, la sube a Meta y devuelve el media_id.
// POST { data: "<base64>", mime: "image/jpeg" }
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { data, mime } = req.body || {};
  if (!data || !mime) return res.status(400).json({ error: "data y mime requeridos" });

  const TOKEN    = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!TOKEN || !PHONE_ID) return res.status(500).json({ error: "Variables WhatsApp no configuradas" });

  try {
    const buffer = Buffer.from(data, "base64");
    const blob   = new Blob([buffer], { type: mime });
    const form   = new FormData();
    form.append("file", blob, "imagen.jpg");
    form.append("type", mime);
    form.append("messaging_product", "whatsapp");

    const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    });

    const result = await r.json();
    if (!r.ok) {
      console.error("[subir-media] Error Meta:", JSON.stringify(result));
      return res.status(r.status).json({ error: result?.error?.message || "Error subiendo imagen" });
    }

    return res.status(200).json({ media_id: result.id });
  } catch (e) {
    console.error("[subir-media] Error:", e);
    return res.status(500).json({ error: e.message });
  }
}
