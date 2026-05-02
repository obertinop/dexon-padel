// /api/whatsapp/media.js
// Proxy para descargar media de Meta (audio, imagen, etc.) y servirla al browser.
// GET /api/whatsapp/media?id={media_id}
// Meta requiere el token para descargar — el browser no puede llamarla directamente.

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id requerido" });

  const TOKEN = process.env.WHATSAPP_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: "WHATSAPP_TOKEN no configurado" });

  try {
    // Paso 1: obtener la URL de descarga real
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!metaRes.ok) {
      const err = await metaRes.json();
      return res.status(metaRes.status).json({ error: err?.error?.message || "Error en Meta API" });
    }
    const { url, mime_type } = await metaRes.json();

    // Paso 2: descargar el archivo usando la URL firmada
    const fileRes = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!fileRes.ok) return res.status(502).json({ error: "No se pudo descargar el archivo" });

    // Paso 3: devolver el contenido al browser con el Content-Type correcto
    res.setHeader("Content-Type", mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");

    const buffer = await fileRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (e) {
    console.error("[whatsapp-media] Error:", e);
    return res.status(500).json({ error: e.message });
  }
}
