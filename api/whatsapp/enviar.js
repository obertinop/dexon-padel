// /api/whatsapp/enviar.js
// Envía plantillas (templates) aprobadas: confirmaciones, reprogramaciones, etc.
// Llamado desde el frontend (admin) y desde flujos de pago.
import {
  sbAdmin, waConfigured, normalizeTel, checkSecret,
  sendTemplate, sendText, ADMIN_TEL,
} from "../../lib/whatsapp.js";

export default async function handler(req, res) {
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

  // ── Plantilla al CLIENTE ──
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
        await sb.from("whatsapp_mensajes").insert({
          de: telCliente, nombre, mensaje: textoLegible,
          tipo: "text", meta_id: r.message_id || null, leido: true, direccion: "saliente", estado: "enviado",
        });
      } catch (e) { console.error("[enviar] Error guardando en DB:", e.message); }
    }
  }

  // ── Aviso al ADMIN (texto libre a TU número personal) ──
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
    console.error("[enviar] Error notificando admin:", e.message);
    resultados.push({ destino: "admin", ok: false, error: e.message });
  }

  return res.status(200).json({ ok: true, resultados });
}

// Construye el objeto template según el tipo. {{1}}..{{n}} = parámetros del body.
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
    default:
      return null;
  }
}
