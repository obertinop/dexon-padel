import { Hono } from 'hono';
import { d1All, d1First, d1Run } from '../lib/db.js';

const app = new Hono();

function calcPrecio(hora, cfg, fecha) {
  const esPico = hora >= cfg.hora_pico_inicio && hora < cfg.hora_pico_fin;
  const base = esPico ? cfg.tarifa_pico : cfg.tarifa_base;
  if (!cfg.desc_martes_jueves_enabled) return base;
  let dias = [];
  try { dias = typeof cfg.desc_martes_jueves_dias === 'string' ? JSON.parse(cfg.desc_martes_jueves_dias) : (cfg.desc_martes_jueves_dias || [2, 4]); } catch { dias = [2, 4]; }
  return dias.includes(new Date(fecha + 'T00:00:00').getDay())
    ? Math.round(base * (1 - (Number(cfg.desc_martes_jueves_percent) || 20) / 100))
    : base;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genCode(nombre = '', telefono = '') {
  const limpiar = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const letras = [...limpiar(nombre || 'X')];
  const digitos = [...(telefono.replace(/\D/g, '') || '0000')];
  const padL = 'XYZWQK';
  while (letras.length < 3) letras.push(padL[letras.length % padL.length]);
  while (digitos.length < 4) digitos.push(String(digitos.length % 10));
  return `${shuffle(letras).slice(0, 3).join('')}-${shuffle(digitos).slice(0, 4).join('')}`;
}

async function buscarClientePorTel(db, telefono) {
  const t9 = telefono.replace(/\D/g, '').replace(/^(595|0)/, '').slice(-9);
  const formatos = [...new Set([`0${t9}`, `595${t9}`, t9, telefono.trim()])];
  for (const tel of formatos) {
    const row = await d1First(db, `SELECT id, referrer_code, saldo_favor FROM clientes WHERE telefono = ? LIMIT 1`, [tel]);
    if (row) return row;
  }
  return null;
}

app.post('/', async (c) => {
  const secret = c.env.API_SECRET;
  if (secret && c.req.header('x-api-secret') !== secret) return c.json({ error: 'No autorizado' }, 401);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Body inválido' }, 400);

  const { nombre, telefono, fecha, slots, referrerCode, usarSaldo } = body;
  if (!nombre?.trim() || !telefono?.trim() || !fecha || !Array.isArray(slots) || slots.length === 0)
    return c.json({ error: 'Faltan datos obligatorios' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return c.json({ error: 'Fecha inválida' }, 400);
  if (slots.some(h => !Number.isInteger(h) || h < 0 || h > 23)) return c.json({ error: 'Horarios inválidos' }, 400);

  const db = c.env.DB;
  const cfg = await d1First(db, `SELECT * FROM config LIMIT 1`);
  if (!cfg) return c.json({ error: 'No se pudo leer la configuración' }, 500);

  const refDescPct = Number(cfg.referral_discount_percent) || 10;
  const preciosPorSlot = slots.map(h => calcPrecio(h, cfg, fecha));
  const subtotal = preciosPorSlot.reduce((a, b) => a + b, 0);

  // Validar código de referido
  let refMatch = null;
  const refCodeNorm = (referrerCode || '').trim().toUpperCase();
  if (refCodeNorm.length >= 4) {
    const r = await d1First(db, `SELECT id, nombre, telefono, saldo_favor FROM clientes WHERE referrer_code = ? LIMIT 1`, [refCodeNorm]);
    if (r) {
      const tNorm = telefono.replace(/\D/g, '').replace(/^(595|0)/, '').slice(-9);
      const mTNorm = (r.telefono || '').replace(/\D/g, '').replace(/^(595|0)/, '').slice(-9);
      if (mTNorm !== tNorm) refMatch = r;
    }
  }
  const descRef = refMatch ? Math.round(subtotal * refDescPct / 100) : 0;

  // Buscar/crear cliente
  let cli = await buscarClientePorTel(db, telefono);
  let codigoCliente = cli?.referrer_code || null;
  let saldoCliente = Number(cli?.saldo_favor) || 0;

  if (!cli) {
    let intentos = 0;
    do {
      codigoCliente = genCode(nombre, telefono);
      const existe = await d1First(db, `SELECT id FROM clientes WHERE referrer_code = ? LIMIT 1`, [codigoCliente]);
      if (!existe) break;
      intentos++;
    } while (intentos < 5);

    const ins = await d1First(db,
      `INSERT INTO clientes (nombre, telefono, nivel, notas, referrer_code) VALUES (?,?,?,?,?) RETURNING *`,
      [nombre.trim(), telefono.trim(), 'intermedio', 'Registrado desde portal', codigoCliente]
    );
    if (!ins) return c.json({ error: 'Error guardando cliente' }, 500);
    cli = ins;
  }

  if (cli && !codigoCliente) {
    codigoCliente = genCode(nombre, telefono);
    await d1Run(db, `UPDATE clientes SET referrer_code = ? WHERE id = ?`, [codigoCliente, cli.id]);
  }

  const descSaldo = usarSaldo ? Math.min(saldoCliente, subtotal - descRef) : 0;
  const totalFinal = Math.max(0, subtotal - descRef - descSaldo);

  // Insertar turnos
  const nota = 'Comprobante enviado vía WhatsApp - Pendiente confirmación';
  const turnosRows = slots.map((h, i) => ({
    fecha, hora: h, tipo: 'ocasional', estado: 'pendiente_pago',
    cliente_id: cli.id, precio: preciosPorSlot[i], sena: 0, saldo: preciosPorSlot[i],
    notas: nota, metodo_pago: 'transferencia',
    day_discount_amount: calcPrecio(h, { ...cfg, desc_martes_jueves_enabled: 0 }, fecha) - preciosPorSlot[i],
    applied_referral_code: refMatch ? refCodeNorm : null,
    referral_discount_amount: refMatch ? Math.round(descRef * (preciosPorSlot[i] / (subtotal || 1))) : 0,
  }));

  const stmts = turnosRows.map(row =>
    db.prepare(`INSERT INTO turnos (fecha,hora,tipo,estado,cliente_id,precio,sena,saldo,notas,metodo_pago,day_discount_amount,applied_referral_code,referral_discount_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`)
      .bind(row.fecha, row.hora, row.tipo, row.estado, row.cliente_id, row.precio, row.sena, row.saldo, row.notas, row.metodo_pago, row.day_discount_amount, row.applied_referral_code, row.referral_discount_amount)
  );
  const results = await db.batch(stmts);
  const turnosInsertados = results.flatMap(r => r.results || []);
  if (!turnosInsertados.length) return c.json({ error: 'Error guardando turnos' }, 500);

  // Actualizar saldos
  const updates = [];
  if (refMatch) {
    updates.push(db.prepare(`UPDATE clientes SET saldo_favor = MAX(0, COALESCE(saldo_favor,0) + ?) WHERE id = ?`).bind(descRef, refMatch.id).run());
  }
  if (descSaldo > 0) {
    updates.push(db.prepare(`UPDATE clientes SET saldo_favor = MAX(0, COALESCE(saldo_favor,0) - ?) WHERE id = ?`).bind(descSaldo, cli.id).run());
  }
  if (updates.length) await Promise.all(updates);

  return c.json({
    ok: true,
    total: totalFinal,
    referrer_code: codigoCliente,
    saldo_restante: Math.max(0, saldoCliente - descSaldo),
  });
});

export default app;
