// /api/whatsapp/responder.js
// Envía un mensaje de texto libre a un número de WhatsApp.
// Funciona dentro de la ventana de 24h después de que el cliente escribió primero.
// POST { telefono, mensaje }
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { telefono, mensaje } = req.body || {};
  if (!telefono || !mensaje) {
    return res.status(400).json({ error: "telefono y mensaje son requeridos" });
  }

  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) {
    return res.status(500).json({ error: "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN no configurados" });
  }

  // Normalizar número: solo dígitos, con código de país
  let tel = telefono.replace(/\D/g, "");
  if (tel.startsWith("0")) tel = "595" + tel.slice(1);
  if (!tel.startsWith("595")) tel = "595" + tel;

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: tel,
        type: "text",
        text: { body: mensaje },
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("[responder] Error Meta API:", JSON.stringify(data));
      return res.status(r.status).json({
        error: data?.error?.message || "Error enviando mensaje",
        code: data?.error?.code,
      });
    }

    console.log("[responder] Enviado a", tel, data?.messages?.[0]?.id);
    return res.status(200).json({ ok: true, message_id: data?.messages?.[0]?.id });
  } catch (e) {
    console.error("[responder] Error de red:", e);
    return res.status(500).json({ error: e.message });
  }
}
