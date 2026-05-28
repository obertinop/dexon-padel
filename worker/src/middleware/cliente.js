import { d1First } from '../lib/db.js';

export async function clienteAuth(c, next) {
  const auth = c.req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return c.json({ error: 'Sin token' }, 401);

  const sess = await d1First(
    c.env.DB,
    `SELECT s.*, c.id as c_id, c.nombre, c.apellido, c.telefono, c.email,
            c.referrer_code, c.saldo_favor, c.notif_recordatorio, c.notif_promo,
            c.notif_email_resumen, c.notif_sms_urgente
     FROM cliente_sessions s
     JOIN clientes c ON c.id = s.cliente_id
     WHERE s.token = ? AND s.expira_en > datetime('now')`,
    [token]
  );
  if (!sess) return c.json({ error: 'Sesión inválida o expirada' }, 401);

  await c.env.DB.prepare(`UPDATE cliente_sessions SET last_seen = datetime('now') WHERE token = ?`).bind(token).run();

  c.set('cliente', {
    id: sess.c_id, nombre: sess.nombre, apellido: sess.apellido,
    telefono: sess.telefono, email: sess.email,
    referrer_code: sess.referrer_code, saldo_favor: sess.saldo_favor,
    notif_recordatorio: sess.notif_recordatorio,
    notif_promo: sess.notif_promo,
    notif_email_resumen: sess.notif_email_resumen,
    notif_sms_urgente: sess.notif_sms_urgente,
  });
  await next();
}
