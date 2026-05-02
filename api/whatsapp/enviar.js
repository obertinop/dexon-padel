// /api/whatsapp/enviar.js
// Endpoint interno para enviar mensajes de WhatsApp vía Meta Cloud API.
// Llamado desde webhook.js (pago confirmado) y desde el frontend (transferencia).
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { tipo, nombre, telefono, fecha, horarios, monto, forma_pago } = req.body || {};

  if (!tipo || !nombre || !telefono) {
    return res.status(400).json({ error: "Faltan datos: tipo, nombre, telefono" });
  }

  const PHONE_ID    = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN       = process.env.WHATSAPP_TOKEN;
  const ADMIN_PHONE = process.env.WHATSAPP_ADMIN_PHONE; // ej: "595981123456"

  if (!PHONE_ID || !TOKEN) {
    return res.status(500).json({ error: "Variables WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN no configuradas" });
  }

  // Normalizar teléfono: sacar todo excepto dígitos, asegurar código de país
  let telCliente = telefono.replace(/\D/g, "");
  if (telCliente.startsWith("0")) telCliente = "595" + telCliente.slice(1);
  if (!telCliente.startsWith("595")) telCliente = "595" + telCliente;

  const resultados = [];

  // ── Mensaje al CLIENTE ───────────────────────────────────────────────────
  let templateCliente = null;

  if (tipo === "pago_confirmado") {
    // Template: dexon_pago_confirmado
    // {{1}} nombre, {{2}} fecha, {{3}} horarios, {{4}} monto, {{5}} forma_pago
    templateCliente = {
      name: "dexon_pago_confirmado",
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: nombre },
          { type: "text", text: fecha || "-" },
          { type: "text", text: horarios || "-" },
          { type: "text", text: monto || "-" },
          { type: "text", text: forma_pago || "Pago online" },
        ],
      }],
    };
  } else if (tipo === "transferencia_pendiente") {
    // Template: dexon_reserva_transferencia
    // {{1}} nombre, {{2}} fecha, {{3}} horarios, {{4}} monto
    templateCliente = {
      name: "dexon_reserva_transferencia",
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: nombre },
          { type: "text", text: fecha || "-" },
          { type: "text", text: horarios || "-" },
          { type: "text", text: monto || "-" },
        ],
      }],
    };
  }

  if (templateCliente) {
    const r = await enviarTemplate(PHONE_ID, TOKEN, telCliente, templateCliente);
    resultados.push({ destino: "cliente", tel: telCliente, ...r });
  }

  // ── Notificación al ADMIN ────────────────────────────────────────────────
  if (ADMIN_PHONE) {
    const metodo = tipo === "pago_confirmado"
      ? `Pagopar - ${forma_pago || "online"}`
      : "Transferencia bancaria";

    const templateAdmin = {
      name: "dexon_admin_reserva",
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: nombre },
          { type: "text", text: telefono },
          { type: "text", text: fecha || "-" },
          { type: "text", text: horarios || "-" },
          { type: "text", text: monto || "-" },
          { type: "text", text: metodo },
        ],
      }],
    };
    const r = await enviarTemplate(PHONE_ID, TOKEN, ADMIN_PHONE, templateAdmin);
    resultados.push({ destino: "admin", tel: ADMIN_PHONE, ...r });
  }

  return res.status(200).json({ ok: true, resultados });
}

async function enviarTemplate(phoneId, token, destino, template) {
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destino,
        type: "template",
        template,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("[whatsapp] Error enviando a", destino, JSON.stringify(data));
      return { ok: false, error: data?.error?.message };
    }
    console.log("[whatsapp] Enviado a", destino, data?.messages?.[0]?.id);
    return { ok: true, message_id: data?.messages?.[0]?.id };
  } catch (e) {
    console.error("[whatsapp] Error de red:", e);
    return { ok: false, error: e.message };
  }
}
