// /api/cron/recordatorios.js
// Cron diario (10:00). Envía recordatorios WhatsApp a clientes con turno confirmado hoy.
// Configurado en vercel.json. Requiere template aprobado en Meta.
import { sbAdmin, waConfigured, normalizeTel, sendTemplate } from "../../lib/whatsapp.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const sb = sbAdmin();

  const { data: cfgRows } = await sb.from("config").select("wa_recordatorio_activo,wa_recordatorio_template").limit(1);
  const cfg = cfgRows?.[0] || {};

  if (!cfg.wa_recordatorio_activo || !cfg.wa_recordatorio_template) {
    return res.status(200).json({ ok: true, msg: "Recordatorios desactivados o sin template" });
  }
  if (!waConfigured()) return res.status(200).json({ ok: false, msg: "WhatsApp no configurado" });

  const fechaHoy = new Date().toISOString().slice(0, 10);

  const { data: turnosPendientes, error } = await sb
    .from("turnos")
    .select("id, hora, fecha, precio, cliente_id, clientes(nombre, telefono)")
    .eq("fecha", fechaHoy).eq("estado", "confirmado").eq("recordatorio_wa", false);

  if (error) {
    console.error("[cron/recordatorios] Error buscando turnos:", error);
    return res.status(500).json({ error: error.message });
  }
  if (!turnosPendientes?.length) return res.status(200).json({ ok: true, enviados: 0 });

  let enviados = 0;
  const ids = [];

  for (const turno of turnosPendientes) {
    const cliente = turno.clientes;
    if (!cliente?.telefono) continue;
    const tel = normalizeTel(cliente.telefono);

    const r = await sendTemplate(tel, {
      name: cfg.wa_recordatorio_template,
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: cliente.nombre },
          { type: "text", text: turno.fecha },
          { type: "text", text: `${turno.hora}:00` },
        ],
      }],
    });

    if (r.ok) {
      ids.push(turno.id);
      enviados++;
      console.log(`[cron/recordatorios] Enviado a ${cliente.nombre} (${tel}) ${turno.fecha} ${turno.hora}:00`);
    } else {
      console.error(`[cron/recordatorios] Error para ${tel}:`, r.error);
    }
  }

  if (ids.length > 0) await sb.from("turnos").update({ recordatorio_wa: true }).in("id", ids);

  console.log(`[cron/recordatorios] ${enviados}/${turnosPendientes.length} recordatorios enviados`);
  return res.status(200).json({ ok: true, enviados, total: turnosPendientes.length });
}
