import { Hono } from 'hono';
import { d1All, d1First, d1Run } from '../lib/db.js';

const app = new Hono();

async function enviarWA(phoneId, token, to, texto) {
  return fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } }),
  });
}

async function enviarTemplate(phoneId, token, to, template) {
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template }),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data?.error?.message };
    return { ok: true, message_id: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// GET + POST /whatsapp/webhook
app.get('/webhook', async (c) => {
  const url = new URL(c.req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === c.env.WHATSAPP_VERIFY_TOKEN) return c.text(challenge);
  return c.json({ error: 'Token de verificación incorrecto' }, 403);
});

app.post('/webhook', async (c) => {
  const body = await c.req.json().catch(() => null);
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return c.json({ ok: true });

  const tipo = message.type || 'desconocido';
  const de = message.from;
  const metaId = message.id;
  const nombre = body.entry[0].changes[0].value?.contacts?.[0]?.profile?.name || de;

  let texto = null;
  let mediaId = null;
  switch (tipo) {
    case 'text':     texto = message.text?.body; break;
    case 'audio':    mediaId = message.audio?.id;    texto = message.audio?.voice ? '[Nota de voz]' : '[Audio]'; break;
    case 'image':    mediaId = message.image?.id;    texto = message.image?.caption || '[Imagen]'; break;
    case 'video':    mediaId = message.video?.id;    texto = message.video?.caption || '[Video]'; break;
    case 'document': mediaId = message.document?.id; texto = message.document?.filename || '[Documento]'; break;
    case 'sticker':  mediaId = message.sticker?.id;  texto = '[Sticker]'; break;
    default:         texto = `[${tipo}]`;
  }

  const db = c.env.DB;

  // Guardar mensaje (upsert por meta_id)
  await db.prepare(
    `INSERT OR IGNORE INTO whatsapp_mensajes (de,nombre,mensaje,tipo,meta_id,media_id,leido,direccion) VALUES (?,?,?,?,?,?,0,'entrante')`
  ).bind(de, nombre, texto, tipo, metaId, mediaId || null).run();

  const cfg = await d1First(db, `SELECT wa_bienvenida_activo, wa_bienvenida_texto, wa_admin_tel FROM config LIMIT 1`);
  const TOKEN = c.env.WHATSAPP_TOKEN;
  const PH_ID = c.env.WHATSAPP_PHONE_ID;

  if (TOKEN && PH_ID) {
    const tareas = [];

    // Bienvenida automática (solo primer mensaje)
    if (cfg?.wa_bienvenida_activo && cfg?.wa_bienvenida_texto) {
      const prev = await d1First(db,
        `SELECT id FROM whatsapp_mensajes WHERE de = ? AND direccion = 'entrante' AND meta_id != ? LIMIT 1`,
        [de, metaId]
      );
      if (!prev) {
        tareas.push(enviarWA(PH_ID, TOKEN, de, cfg.wa_bienvenida_texto).catch(() => {}));
      }
    }

    // Notificación admin
    const adminTel = cfg?.wa_admin_tel || c.env.WHATSAPP_ADMIN_NOTIFY || '595981086046';
    if (de !== adminTel) {
      const preview = texto && texto.length > 60 ? texto.slice(0, 60) + '…' : texto;
      tareas.push(enviarWA(PH_ID, TOKEN, adminTel, `📩 Mensaje de ${nombre}:\n${preview}`).catch(() => {}));
    }

    await Promise.all(tareas);
  }

  return c.json({ ok: true });
});

// POST /whatsapp/enviar
app.post('/enviar', async (c) => {
  const secret = c.env.API_SECRET;
  if (secret && c.req.header('x-api-secret') !== secret) return c.json({ error: 'No autorizado' }, 401);

  const body = await c.req.json().catch(() => null);
  const { tipo, nombre, telefono, fecha, horarios, monto, forma_pago } = body || {};
  if (!tipo || !nombre || !telefono) return c.json({ error: 'Faltan datos: tipo, nombre, telefono' }, 400);

  const PHONE_ID = c.env.WHATSAPP_PHONE_ID;
  const TOKEN = c.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) return c.json({ error: 'WhatsApp no configurado' }, 500);

  let telCliente = telefono.replace(/\D/g, '');
  if (telCliente.startsWith('0')) telCliente = '595' + telCliente.slice(1);
  if (!telCliente.startsWith('595')) telCliente = '595' + telCliente;

  const resultados = [];
  let templateCliente = null;

  if (tipo === 'pago_confirmado' || tipo === 'confirmacion_manual') {
    templateCliente = { name: 'dexon_pago_confirmado', language: { code: 'es' }, components: [{ type: 'body', parameters: [
      { type: 'text', text: nombre }, { type: 'text', text: fecha || '-' },
      { type: 'text', text: horarios || '-' }, { type: 'text', text: monto || '-' },
      { type: 'text', text: forma_pago || 'Pago online' },
    ]}]};
  } else if (tipo === 'reprogramacion') {
    templateCliente = { name: 'dexon_reprogramacion', language: { code: 'es' }, components: [{ type: 'body', parameters: [
      { type: 'text', text: nombre }, { type: 'text', text: fecha || '-' },
      { type: 'text', text: horarios || '-' }, { type: 'text', text: body.motivo || 'motivos internos' },
    ]}]};
  } else if (tipo === 'confirmacion_presencial') {
    templateCliente = { name: 'dexon_confirmacion_presencial', language: { code: 'es' }, components: [{ type: 'body', parameters: [
      { type: 'text', text: nombre }, { type: 'text', text: fecha || '-' },
      { type: 'text', text: horarios || '-' },
    ]}]};
  } else if (tipo === 'transferencia_pendiente') {
    templateCliente = { name: 'dexon_reserva_transferencia', language: { code: 'es' }, components: [{ type: 'body', parameters: [
      { type: 'text', text: nombre }, { type: 'text', text: fecha || '-' },
      { type: 'text', text: horarios || '-' }, { type: 'text', text: monto || '-' },
    ]}]};
  }

  const db = c.env.DB;

  if (templateCliente) {
    const r = await enviarTemplate(PHONE_ID, TOKEN, telCliente, templateCliente);
    resultados.push({ destino: 'cliente', tel: telCliente, ...r });

    if (r.ok) {
      const textoLegible = (tipo === 'pago_confirmado' || tipo === 'confirmacion_manual')
        ? `✅ Reserva confirmada\n📅 ${fecha || '-'} a las ${horarios || '-'}\n💰 ${monto || '-'}\n💳 ${forma_pago || 'Pago online'}`
        : tipo === 'confirmacion_presencial'
        ? `✅ Reserva confirmada (pago en el lugar)\n📅 ${fecha || '-'} a las ${horarios || '-'}`
        : `⏳ Reserva pendiente de confirmación\n📅 ${fecha || '-'} a las ${horarios || '-'}\n💰 ${monto || '-'}`;
      await db.prepare(`INSERT OR IGNORE INTO whatsapp_mensajes (de,nombre,mensaje,tipo,meta_id,leido,direccion) VALUES (?,?,?,?,?,1,'saliente')`)
        .bind(telCliente, nombre, textoLegible, 'text', r.message_id || null).run().catch(() => {});
    }
  }

  // Notificación admin
  try {
    const cfg = await d1First(db, `SELECT wa_admin_tel FROM config LIMIT 1`);
    const adminTel = cfg?.wa_admin_tel || c.env.WHATSAPP_ADMIN_NOTIFY || '595981086046';
    const metodo = tipo === 'pago_confirmado' ? `Pagopar - ${forma_pago || 'online'}` : forma_pago || 'Transferencia bancaria';
    const textoAdmin = tipo === 'reprogramacion'
      ? `🔄 Turno reprogramado\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || '-'} a las ${horarios || '-'}\n📝 ${body.motivo || '-'}`
      : tipo === 'confirmacion_presencial'
      ? `✅ Turno confirmado (efectivo)\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || '-'} a las ${horarios || '-'}`
      : `📋 Nueva reserva\n\n👤 ${nombre}\n📞 ${telefono}\n📅 ${fecha || '-'} a las ${horarios || '-'}\n💰 ${monto || '-'}\n💳 ${metodo}`;
    const rAdmin = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: adminTel, type: 'text', text: { body: textoAdmin } }),
    });
    resultados.push({ destino: 'admin', tel: adminTel, ok: rAdmin.ok });
  } catch (e) {
    resultados.push({ destino: 'admin', ok: false, error: e.message });
  }

  return c.json({ ok: true, resultados });
});

// POST /whatsapp/responder
app.post('/responder', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { telefono, mensaje, tipo = 'texto', media_id, caption } = body || {};
  if (!telefono) return c.json({ error: 'telefono requerido' }, 400);
  if (tipo === 'texto' && !mensaje) return c.json({ error: 'mensaje requerido' }, 400);

  const PHONE_ID = c.env.WHATSAPP_PHONE_ID;
  const TOKEN = c.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) return c.json({ error: 'WhatsApp no configurado' }, 500);

  let tel = telefono.replace(/\D/g, '');
  if (tel.startsWith('0')) tel = '595' + tel.slice(1);
  if (!tel.startsWith('595')) tel = '595' + tel;

  const msgBody = (tipo === 'imagen' && media_id)
    ? { type: 'image', image: { id: media_id, ...(caption ? { caption } : {}) } }
    : { type: 'text', text: { body: mensaje } };

  const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: tel, ...msgBody }),
  });
  const data = await r.json();
  if (!r.ok) return c.json({ error: data?.error?.message || 'Error enviando mensaje', code: data?.error?.code }, r.status);

  const metaId = data?.messages?.[0]?.id;
  await c.env.DB.prepare(`INSERT OR IGNORE INTO whatsapp_mensajes (de,nombre,mensaje,tipo,media_id,meta_id,leido,direccion) VALUES (?,?,?,?,?,?,1,'saliente')`)
    .bind(tel, 'DEXON', tipo === 'imagen' ? (caption || '[Imagen enviada]') : mensaje, tipo === 'imagen' ? 'image' : 'text', media_id || null, metaId || null).run().catch(() => {});

  return c.json({ ok: true, message_id: metaId });
});

// GET /whatsapp/mensajes
app.get('/mensajes', async (c) => {
  const url = new URL(c.req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '500'), 1000);
  const soloNoLeidos = url.searchParams.get('solo_no_leidos') === 'true';
  const sql = `SELECT * FROM whatsapp_mensajes ${soloNoLeidos ? "WHERE leido = 0" : ''} ORDER BY created_at ASC LIMIT ?`;
  const rows = await d1All(c.env.DB, sql, [limit]);
  return c.json(rows);
});

// POST /whatsapp/mensajes (marcar leídos)
app.post('/mensajes', async (c) => {
  const { ids } = await c.req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) return c.json({ error: 'ids requerido' }, 400);
  const placeholders = ids.map(() => '?').join(',');
  await d1Run(c.env.DB, `UPDATE whatsapp_mensajes SET leido = 1 WHERE id IN (${placeholders})`, ids);
  return c.json({ ok: true });
});

// DELETE /whatsapp/mensajes
app.delete('/mensajes', async (c) => {
  const { de } = await c.req.json().catch(() => ({}));
  if (!de) return c.json({ error: 'de requerido' }, 400);
  await d1Run(c.env.DB, `DELETE FROM whatsapp_mensajes WHERE de = ?`, [de]);
  return c.json({ ok: true });
});

// GET /whatsapp/media?id=...
app.get('/media', async (c) => {
  const id = new URL(c.req.url).searchParams.get('id');
  if (!id) return c.json({ error: 'id requerido' }, 400);

  const TOKEN = c.env.WHATSAPP_TOKEN;
  if (!TOKEN) return c.json({ error: 'WHATSAPP_TOKEN no configurado' }, 500);

  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!metaRes.ok) { const err = await metaRes.json(); return c.json({ error: err?.error?.message || 'Error Meta API' }, metaRes.status); }
  const { url, mime_type } = await metaRes.json();

  const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!fileRes.ok) return c.json({ error: 'No se pudo descargar el archivo' }, 502);

  const buffer = await fileRes.arrayBuffer();
  return new Response(buffer, {
    headers: { 'Content-Type': mime_type || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' },
  });
});

export default app;
