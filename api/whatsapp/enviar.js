// /api/whatsapp/enviar.js
// Endpoint interno para enviar mensajes de WhatsApp vía Meta Cloud API.
// Llamado desde webhook.js (pago confirmado) y desde el frontend (transferencia).
import { createClient } from "@supabase/supabase-js";

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

  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_TOKEN;

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

  // ── Notificación al ADMIN (texto libre, lee teléfono desde config) ─────
  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: cfgRows } = await sb.from("config").select("wa_admin_tel").limit(1);
    const adminTel = cfgRows?.[0]?.wa_admin_tel || process.env.WHATSAPP_ADMIN_NOTIFY || "595981086046";

    const metodo = tipo === "pago_confirmado"
      ? `Pagopar - ${forma_pago || "online"}`
      : "Transferencia bancaria";

    const textoAdmin =
      `📋 Nueva reserva\n\n` +
      `👤 ${nombre}\n` +
      `📞 ${telefono}\n` +
      `📅 ${fecha || "-"} a las ${horarios || "-"}\n` +
      `💰 ${monto || "-"}\n` +
      `💳 ${metodo}`;

    const rAdmin = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: adminTel,
        type: "text",
        text: { body: textoAdmin },
      }),
    });
    const dataAdmin = await rAdmin.json();
    if (!rAdmin.ok) console.error("[enviar] Error notif admin:", JSON.stringify(dataAdmin));
    resultados.push({ destino: "admin", tel: adminTel, ok: rAdmin.ok, error: dataAdmin?.error?.message });
  } catch (e) {
    console.error("[enviar] Error notificando admin:", e.message);
    resultados.push({ destino: "admin", ok: false, error: e.message });
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
