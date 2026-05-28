import { Hono } from 'hono';
import { clienteAuth } from '../middleware/cliente.js';
import { d1All, d1First, d1Run } from '../lib/db.js';

const app = new Hono();

function normalizarTel(raw) {
  let t = (raw || '').replace(/\D/g, '');
  if (!t) return null;
  if (t.startsWith('0')) t = '595' + t.slice(1);
  if (!t.startsWith('595')) t = '595' + t;
  return t.length < 11 ? null : t;
}

function genRefCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'REF-';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function genSessionToken() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buscarClientePorTel(db, tel) {
  const t9 = tel.replace(/^595/, '').slice(-9);
  const formatos = [...new Set([tel, `0${t9}`, `595${t9}`, t9])];
  for (const fmt of formatos) {
    const row = await d1First(db, `SELECT * FROM clientes WHERE telefono = ? LIMIT 1`, [fmt]);
    if (row) return row;
  }
  return null;
}

// POST /cliente/auth-send
app.post('/auth-send', async (c) => {
  const { telefono } = await c.req.json().catch(() => ({}));
  const tel = normalizarTel(telefono);
  if (!tel) return c.json({ error: 'Teléfono inválido' }, 400);

  const db = c.env.DB;

  const reciente = await d1First(db, `SELECT creado_en FROM otp_codes WHERE telefono = ? ORDER BY creado_en DESC LIMIT 1`, [tel]);
  if (reciente) {
    const ageSec = (Date.now() - new Date(reciente.creado_en).getTime()) / 1000;
    if (ageSec < 60) return c.json({ error: `Esperá ${Math.ceil(60 - ageSec)}s para reenviar` }, 429);
  }

  const cliExiste = await buscarClientePorTel(db, tel);
  const isNewClient = !cliExiste;
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const expira = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await d1Run(db, `INSERT INTO otp_codes (telefono, codigo, expira_en, ip) VALUES (?,?,?,?)`,
    [tel, codigo, expira, c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null]);

  const PHONE_ID = c.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN = c.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) return c.json({ error: 'WhatsApp no configurado' }, 500);

  const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: tel, type: 'template',
      template: {
        name: 'dexon_codigo', language: { code: 'es' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: codigo }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: codigo }] },
        ],
      },
    }),
  });
  if (!r.ok) {
    const d = await r.json();
    return c.json({ error: 'No se pudo enviar el código', wa_code: d?.error?.code, wa_msg: d?.error?.message }, 500);
  }

  return c.json({ ok: true, isNewClient, expira_en: expira });
});

// POST /cliente/auth-verify
app.post('/auth-verify', async (c) => {
  const { telefono, codigo, nombre, apellido } = await c.req.json().catch(() => ({}));
  const tel = normalizarTel(telefono);
  if (!tel || !/^\d{6}$/.test(codigo || '')) return c.json({ error: 'Datos inválidos' }, 400);

  const db = c.env.DB;

  const otp = await d1First(db,
    `SELECT * FROM otp_codes WHERE telefono = ? AND usado = 0 AND expira_en > datetime('now') ORDER BY creado_en DESC LIMIT 1`,
    [tel]
  );
  if (!otp) return c.json({ error: 'Código vencido o inexistente. Pedí uno nuevo.' }, 400);
  if (otp.intentos >= 5) return c.json({ error: 'Demasiados intentos. Pedí un código nuevo.' }, 429);

  if (otp.codigo !== codigo) {
    await d1Run(db, `UPDATE otp_codes SET intentos = intentos + 1 WHERE id = ?`, [otp.id]);
    return c.json({ error: 'Código incorrecto' }, 401);
  }

  await d1Run(db, `UPDATE otp_codes SET usado = 1 WHERE id = ?`, [otp.id]);

  let cli = await buscarClientePorTel(db, tel);

  if (!cli) {
    if (!nombre?.trim()) return c.json({ error: 'Completá tu nombre para crear la cuenta.', needsRegistration: true }, 409);
    const nombreCompleto = apellido?.trim() ? `${nombre.trim()} ${apellido.trim()}` : nombre.trim();
    cli = await d1First(db,
      `INSERT INTO clientes (nombre, telefono, referrer_code, saldo_favor) VALUES (?,?,?,0) RETURNING *`,
      [nombreCompleto, tel, genRefCode()]
    );
    if (!cli) return c.json({ error: 'No se pudo crear el cliente' }, 500);
  }

  const token = await genSessionToken();
  const expira = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  await d1Run(db, `INSERT INTO cliente_sessions (cliente_id, token, expira_en, ip, user_agent) VALUES (?,?,?,?,?)`,
    [cli.id, token, expira, c.req.header('cf-connecting-ip') || null, c.req.header('user-agent') || null]);
  await d1Run(db, `UPDATE clientes SET ultimo_acceso = datetime('now') WHERE id = ?`, [cli.id]);

  return c.json({
    ok: true, token, expira_en: expira,
    cliente: { id: cli.id, nombre: cli.nombre, apellido: cli.apellido, telefono: cli.telefono, email: cli.email || null, referrer_code: cli.referrer_code, saldo_favor: cli.saldo_favor || 0 },
  });
});

// GET /cliente/me
app.get('/me', clienteAuth, async (c) => {
  const cliente = c.get('cliente');
  const db = c.env.DB;
  const hoy = new Date().toISOString().slice(0, 10);

  const [proximas, pasadas, pagos, favoritos, abono, referidos, cfgArr] = await Promise.all([
    d1All(db, `SELECT * FROM turnos WHERE cliente_id = ? AND fecha >= ? AND estado != 'cancelado' ORDER BY fecha ASC, hora ASC LIMIT 20`, [cliente.id, hoy]),
    d1All(db, `SELECT * FROM turnos WHERE cliente_id = ? AND fecha < ? ORDER BY fecha DESC, hora DESC LIMIT 50`, [cliente.id, hoy]),
    d1All(db, `SELECT id,fecha,hora,precio,metodo_pago,created_at FROM turnos WHERE cliente_id = ? AND cobrado = 1 ORDER BY created_at DESC LIMIT 50`, [cliente.id]),
    d1All(db, `SELECT * FROM cliente_favoritos WHERE cliente_id = ?`, [cliente.id]),
    d1First(db, `SELECT * FROM abonos WHERE cliente_id = ? AND estado = 'activo' LIMIT 1`, [cliente.id]),
    db.prepare(`SELECT COUNT(*) as total FROM turnos WHERE applied_referral_code = ?`).bind(cliente.referrer_code || '').first(),
    d1First(db, `SELECT referral_discount_percent FROM config LIMIT 1`),
  ]);

  const enrich = arr => (arr || []).map(t => ({ ...t, inicio: t.fecha ? `${t.fecha}T${String(t.hora || 0).padStart(2, '0')}:00:00` : null, pagado: t.cobrado === 1 }));

  return c.json({
    cliente: {
      id: cliente.id, nombre: cliente.nombre, apellido: cliente.apellido || '',
      telefono: cliente.telefono, email: cliente.email,
      referrer_code: cliente.referrer_code, saldo_favor: cliente.saldo_favor || 0,
      notif: {
        recordatorio: cliente.notif_recordatorio !== 0,
        promo: cliente.notif_promo === 1,
        email_resumen: cliente.notif_email_resumen === 1,
        sms_urgente: cliente.notif_sms_urgente !== 0,
      },
    },
    proximas: enrich(proximas),
    pasadas: enrich(pasadas),
    pagos: enrich(pagos),
    favoritos: favoritos || [],
    abono: abono || null,
    referidos: { total: referidos?.total || 0 },
    ref_pct: Number(cfgArr?.referral_discount_percent) || 10,
  });
});

// POST /cliente/turno-accion
app.post('/turno-accion', clienteAuth, async (c) => {
  const cliente = c.get('cliente');
  const { accion, turno_id, nuevo_inicio } = await c.req.json().catch(() => ({}));
  if (!accion || !turno_id) return c.json({ error: 'Faltan datos' }, 400);

  const db = c.env.DB;
  const turno = await d1First(db, `SELECT * FROM turnos WHERE id = ? AND cliente_id = ? LIMIT 1`, [turno_id, cliente.id]);
  if (!turno) return c.json({ error: 'Turno no encontrado' }, 404);

  const HORAS_LIMITE = 12;

  if (accion === 'cancelar' || accion === 'reagendar') {
    const horasFalta = (new Date(`${turno.fecha}T${String(turno.hora).padStart(2, '0')}:00:00`).getTime() - Date.now()) / 3600000;
    if (horasFalta < HORAS_LIMITE) return c.json({ error: `Solo podés ${accion} hasta ${HORAS_LIMITE}h antes. Escribinos por WhatsApp.` }, 403);
    if (turno.tipo === 'abono') return c.json({ error: 'Los turnos de abono se gestionan con el administrador' }, 403);
  }

  if (accion === 'cancelar') {
    await d1Run(db, `UPDATE turnos SET estado = 'cancelado' WHERE id = ?`, [turno.id]);
    return c.json({ ok: true });
  }

  if (accion === 'reagendar') {
    if (!nuevo_inicio) return c.json({ error: 'Falta nuevo_inicio' }, 400);
    const nuevaFecha = nuevo_inicio.slice(0, 10);
    const nuevaHora = Number(nuevo_inicio.slice(11, 13));
    const choque = await d1First(db, `SELECT id FROM turnos WHERE id != ? AND estado != 'cancelado' AND fecha = ? AND hora = ? LIMIT 1`, [turno.id, nuevaFecha, nuevaHora]);
    if (choque) return c.json({ error: 'Ese horario ya está ocupado' }, 409);
    await d1Run(db, `UPDATE turnos SET fecha = ?, hora = ? WHERE id = ?`, [nuevaFecha, nuevaHora, turno.id]);
    return c.json({ ok: true });
  }

  return c.json({ error: 'Acción no soportada' }, 400);
});

// PATCH /cliente/perfil
app.patch('/perfil', clienteAuth, async (c) => {
  const cliente = c.get('cliente');
  const { nombre, email } = await c.req.json().catch(() => ({}));
  const campos = {};
  if (nombre?.trim()) campos.nombre = nombre.trim();
  if (email !== undefined) campos.email = email?.trim() || null;
  if (!Object.keys(campos).length) return c.json({ error: 'Nada para actualizar' }, 400);

  const sets = Object.keys(campos).map(k => `"${k}" = ?`).join(', ');
  await c.env.DB.prepare(`UPDATE clientes SET ${sets} WHERE id = ?`).bind(...Object.values(campos), cliente.id).run();
  return c.json({ ok: true });
});

// PATCH /cliente/notif
app.patch('/notif', clienteAuth, async (c) => {
  const cliente = c.get('cliente');
  const { recordatorio, promo, email_resumen, sms_urgente } = await c.req.json().catch(() => ({}));
  const campos = {};
  if (recordatorio  !== undefined) campos.notif_recordatorio  = recordatorio ? 1 : 0;
  if (promo         !== undefined) campos.notif_promo         = promo ? 1 : 0;
  if (email_resumen !== undefined) campos.notif_email_resumen = email_resumen ? 1 : 0;
  if (sms_urgente   !== undefined) campos.notif_sms_urgente   = sms_urgente ? 1 : 0;
  if (!Object.keys(campos).length) return c.json({ error: 'Nada para actualizar' }, 400);

  const sets = Object.keys(campos).map(k => `"${k}" = ?`).join(', ');
  await c.env.DB.prepare(`UPDATE clientes SET ${sets} WHERE id = ?`).bind(...Object.values(campos), cliente.id).run();
  return c.json({ ok: true });
});

// POST /cliente/favoritos
app.post('/favoritos', clienteAuth, async (c) => {
  const cliente = c.get('cliente');
  const { dia_semana, hora, duracion, label } = await c.req.json().catch(() => ({}));
  if (dia_semana === undefined || !hora) return c.json({ error: 'Faltan día y hora' }, 400);
  const dia = Number(dia_semana);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) return c.json({ error: 'dia_semana debe ser 0-6' }, 400);

  const row = await d1First(c.env.DB,
    `INSERT INTO cliente_favoritos (cliente_id, dia_semana, hora, duracion, label) VALUES (?,?,?,?,?) RETURNING *`,
    [cliente.id, dia, hora.trim(), Number(duracion) || 60, label?.trim() || null]
  );
  return c.json({ ok: true, favorito: row }, 201);
});

// DELETE /cliente/favoritos?id=N
app.delete('/favoritos', clienteAuth, async (c) => {
  const cliente = c.get('cliente');
  const id = Number(new URL(c.req.url).searchParams.get('id'));
  if (!id) return c.json({ error: 'Falta id' }, 400);
  const fav = await d1First(c.env.DB, `SELECT id FROM cliente_favoritos WHERE id = ? AND cliente_id = ? LIMIT 1`, [id, cliente.id]);
  if (!fav) return c.json({ error: 'Favorito no encontrado' }, 404);
  await d1Run(c.env.DB, `DELETE FROM cliente_favoritos WHERE id = ?`, [id]);
  return c.json({ ok: true });
});

// GET /cliente/disponibilidad?fecha=YYYY-MM-DD
app.get('/disponibilidad', clienteAuth, async (c) => {
  const fecha = (new URL(c.req.url).searchParams.get('fecha') || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return c.json({ error: 'Falta parámetro fecha' }, 400);

  const db = c.env.DB;
  const [ocupados, cfg] = await Promise.all([
    d1All(db, `SELECT hora FROM turnos WHERE estado != 'cancelado' AND fecha = ?`, [fecha]),
    d1First(db, `SELECT hora_inicio, hora_fin, tarifa_base, tarifa_pico, hora_pico_inicio, hora_pico_fin FROM config LIMIT 1`),
  ]);

  const c2 = cfg || { hora_inicio: 10, hora_fin: 24, tarifa_base: 80000, tarifa_pico: 100000, hora_pico_inicio: 19, hora_pico_fin: 22 };
  const ocupadas = new Set(ocupados.map(t => Number(t.hora)));
  const ahoraMs = Date.now();

  const slots = [];
  for (let h = Number(c2.hora_inicio); h < Number(c2.hora_fin); h++) {
    if (ocupadas.has(h)) continue;
    if (new Date(`${fecha}T${String(h).padStart(2, '0')}:00:00Z`).getTime() <= ahoraMs) continue;
    const esPico = h >= Number(c2.hora_pico_inicio) && h < Number(c2.hora_pico_fin);
    slots.push({ inicio: `${fecha}T${String(h).padStart(2, '00')}:00:00`, precio: esPico ? Number(c2.tarifa_pico) : Number(c2.tarifa_base), esPico });
  }

  return c.json({ slots });
});

export default app;
