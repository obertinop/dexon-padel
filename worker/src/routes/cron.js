import { d1All, d1First, d1Run } from '../lib/db.js';

export async function runRecordatorios(env) {
  const db = env.DB;
  const cfg = await d1First(db, `SELECT wa_recordatorio_activo, wa_recordatorio_template FROM config LIMIT 1`);
  if (!cfg?.wa_recordatorio_activo || !cfg?.wa_recordatorio_template) return { ok: true, msg: 'Recordatorios desactivados' };

  const TOKEN = env.WHATSAPP_TOKEN;
  const PH_ID = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!TOKEN || !PH_ID) return { ok: false, msg: 'Variables WA no configuradas' };

  const fechaHoy = new Date().toISOString().slice(0, 10);
  const turnos = await d1All(db,
    `SELECT t.id, t.hora, t.fecha, t.precio, c.nombre, c.telefono
     FROM turnos t JOIN clientes c ON c.id = t.cliente_id
     WHERE t.fecha = ? AND t.estado = 'confirmado' AND t.recordatorio_wa = 0`,
    [fechaHoy]
  );

  if (!turnos.length) return { ok: true, enviados: 0 };

  let enviados = 0;
  const ids = [];

  for (const turno of turnos) {
    if (!turno.telefono) continue;
    let tel = turno.telefono.replace(/\D/g, '');
    if (tel.startsWith('0')) tel = '595' + tel.slice(1);
    if (!tel.startsWith('595')) tel = '595' + tel;

    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${PH_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: tel, type: 'template',
          template: {
            name: cfg.wa_recordatorio_template, language: { code: 'es' },
            components: [{ type: 'body', parameters: [
              { type: 'text', text: turno.nombre },
              { type: 'text', text: turno.fecha },
              { type: 'text', text: `${turno.hora}:00` },
            ]}],
          },
        }),
      });
      if (r.ok) { ids.push(turno.id); enviados++; }
    } catch { /* continuar con el siguiente */ }
  }

  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    await d1Run(db, `UPDATE turnos SET recordatorio_wa = 1 WHERE id IN (${placeholders})`, ids);
  }

  return { ok: true, enviados, total: turnos.length };
}
