// /api/cron/recordatorios.js
// Cron que corre cada hora. Envía recordatorios WhatsApp a clientes con turno en ~3 horas.
// Configurado en vercel.json. Requiere template aprobado en Meta.
//
// SQL:
//   alter table turnos add column if not exists recordatorio_wa boolean default false;
//   alter table config add column if not exists wa_recordatorio_activo boolean default false;
//   alter table config add column if not exists wa_recordatorio_template text;

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Vercel invoca el cron con un header especial; en dev se puede llamar manualmente
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Leer config
  const { data: cfgRows } = await sb.from("config")
    .select("wa_recordatorio_activo,wa_recordatorio_template")
    .limit(1);
  const cfg = cfgRows?.[0] || {};

  if (!cfg.wa_recordatorio_activo || !cfg.wa_recordatorio_template) {
    return res.status(200).json({ ok: true, msg: "Recordatorios desactivados o sin template" });
  }

  const TOKEN  = process.env.WHATSAPP_TOKEN;
  const PH_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!TOKEN || !PH_ID) return res.status(200).json({ ok: false, msg: "Variables WA no configuradas" });

  // Calcular la hora objetivo: ahora + 3hs
  const ahora     = new Date();
  const horaObj   = ahora.getHours() + 3;
  const fechaHoy  = ahora.toISOString().slice(0, 10);

  // Si la hora objetivo supera el día, buscar en el día siguiente
  const fechaBuscar = horaObj >= 24
    ? new Date(ahora.getTime() + 86400000).toISOString().slice(0, 10)
    : fechaHoy;
  const horaBuscar  = horaObj >= 24 ? horaObj - 24 : horaObj;

  // Buscar turnos reservados en esa franja que no tengan recordatorio enviado
  const { data: turnosPendientes, error } = await sb
    .from("turnos")
    .select("id, hora, fecha, precio, cliente_id, clientes(nombre, telefono)")
    .eq("fecha", fechaBuscar)
    .eq("hora", horaBuscar)
    .eq("estado", "reservado")
    .eq("recordatorio_wa", false);

  if (error) {
    console.error("[cron/recordatorios] Error buscando turnos:", error);
    return res.status(500).json({ error: error.message });
  }

  if (!turnosPendientes?.length) {
    return res.status(200).json({ ok: true, enviados: 0 });
  }

  let enviados = 0;
  const ids = [];

  for (const turno of turnosPendientes) {
    const cliente = turno.clientes;
    if (!cliente?.telefono) continue;

    let tel = cliente.telefono.replace(/\D/g, "");
    if (tel.startsWith("0")) tel = "595" + tel.slice(1);
    if (!tel.startsWith("595")) tel = "595" + tel;

    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${PH_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: tel,
          type: "template",
          template: {
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
          },
        }),
      });

      if (r.ok) {
        ids.push(turno.id);
        enviados++;
        console.log(`[cron/recordatorios] Enviado a ${cliente.nombre} (${tel}) turno ${turno.fecha} ${turno.hora}:00`);
      } else {
        const err = await r.json();
        console.error(`[cron/recordatorios] Error para ${tel}:`, JSON.stringify(err));
      }
    } catch (e) {
      console.error(`[cron/recordatorios] Error de red para ${tel}:`, e.message);
    }
  }

  // Marcar como enviados para no duplicar
  if (ids.length > 0) {
    await sb.from("turnos").update({ recordatorio_wa: true }).in("id", ids);
  }

  console.log(`[cron/recordatorios] ${enviados}/${turnosPendientes.length} recordatorios enviados`);
  return res.status(200).json({ ok: true, enviados, total: turnosPendientes.length });
}
