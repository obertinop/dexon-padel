import { Hono } from 'hono';
import { sha1 } from '../lib/sha1.js';
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

function limpiarTexto(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

function mezclar(chars, origen) {
  for (let i = 0; i < 20; i++) {
    const m = shuffle(chars);
    const res = m.join('');
    let ok = true;
    for (let j = 0; j <= res.length - 3; j++) {
      if (origen.includes(res.slice(j, j + 3))) { ok = false; break; }
    }
    if (ok) return m;
  }
  return shuffle(chars);
}

function genCodigoBase(nombre, telefono) {
  const letras = [...limpiarTexto(nombre)];
  const digitos = [...telefono.replace(/\D/g, '')];
  const pad = 'XYZWQK';
  while (letras.length < 3) letras.push(pad[letras.length % pad.length]);
  while (digitos.length < 4) digitos.push(String(digitos.length % 10));
  return `${mezclar(letras, limpiarTexto(nombre)).slice(0, 3).join('')}-${mezclar(digitos, telefono.replace(/\D/g, '')).slice(0, 4).join('')}`;
}

async function genCodePersonalizado(db, nombre, telefono) {
  for (let i = 0; i < 10; i++) {
    const codigo = genCodigoBase(nombre, telefono);
    const existe = await d1First(db, `SELECT id FROM clientes WHERE referrer_code = ? LIMIT 1`, [codigo]);
    if (!existe) return codigo;
  }
  return genCodigoBase(nombre, telefono) + Math.floor(Math.random() * 9);
}

async function buscarClientePorTel(db, telefono) {
  const t9 = telefono.replace(/\D/g, '').replace(/^(595|0)/, '').slice(-9);
  const formatos = [...new Set([`0${t9}`, `595${t9}`, t9, telefono.trim()])];
  for (const tel of formatos) {
    const row = await d1First(db, `SELECT id, referrer_code FROM clientes WHERE telefono = ? LIMIT 1`, [tel]);
    if (row) return row;
  }
  return null;
}

// POST /pagopar/crear-pago
app.post('/crear-pago', async (c) => {
  const db = c.env.DB;
  const PUBLIC_KEY = c.env.PAGOPAR_PUBLIC_KEY;
  const PRIVATE_KEY = c.env.PAGOPAR_PRIVATE_KEY;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return c.json({ error: 'Pagopar no configurado' }, 500);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Body inválido' }, 400);

  const { nombre, telefono, email, documento, fecha, slots, referrerCode, usarSaldo } = body;
  if (!nombre || !telefono || !fecha || !Array.isArray(slots) || !slots.length)
    return c.json({ error: 'Faltan datos obligatorios' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return c.json({ error: 'Fecha inválida' }, 400);
  if (slots.some(h => !Number.isInteger(h) || h < 0 || h > 23)) return c.json({ error: 'Horarios inválidos' }, 400);

  const cfg = await d1First(db, `SELECT * FROM config LIMIT 1`);
  if (!cfg) return c.json({ error: 'No se pudo leer configuración' }, 500);

  const refDescPct = Number(cfg.referral_discount_percent) || 10;
  const preciosPorSlot = slots.map(h => calcPrecio(h, cfg, fecha));
  const subtotal = preciosPorSlot.reduce((a, b) => a + b, 0);

  let refMatch = null;
  let codigoRefDoc = null;
  let descPctUsado = refDescPct;
  const refCodeNorm = (referrerCode || '').trim().toUpperCase();

  if (refCodeNorm.length >= 4) {
    const cod = await d1First(db, `SELECT * FROM codigos_referido WHERE codigo = ? LIMIT 1`, [refCodeNorm]);
    if (cod?.activo && (cod.max_usos === null || cod.usos_actuales < cod.max_usos)) {
      codigoRefDoc = cod;
      descPctUsado = Number(cod.descuento_pct) || 10;
    }
    if (!codigoRefDoc) {
      const r = await d1First(db, `SELECT id, nombre, telefono, saldo_favor FROM clientes WHERE referrer_code = ? LIMIT 1`, [refCodeNorm]);
      if (r) {
        const tNorm = telefono.replace(/\D/g, '').replace(/^(595|0)/, '').slice(-9);
        const mTNorm = (r.telefono || '').replace(/\D/g, '').replace(/^(595|0)/, '').slice(-9);
        if (mTNorm !== tNorm) refMatch = r;
      }
    }
  }
  const descRef = (refMatch || codigoRefDoc) ? Math.round(subtotal * descPctUsado / 100) : 0;
  const montoInt = Math.max(0, subtotal - descRef);

  // Llamar a Pagopar
  const idPedido = `RES${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const token = await sha1(PRIVATE_KEY + idPedido + String(parseFloat(montoInt)));
  const fechaMax = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const horasStr = slots.map(h => `${h}:00`).join(', ');
  const descripcion = `Reserva DEXON Padel - ${fecha} - ${horasStr}`;

  let telNorm = telefono.replace(/\s+/g, '');
  if (!telNorm.startsWith('+')) telNorm = telNorm.startsWith('0') ? `+595${telNorm.slice(1)}` : `+595${telNorm}`;

  let pagoparData;
  try {
    const r = await fetch('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token, public_key: PUBLIC_KEY, monto_total: montoInt,
        tipo_pedido: 'VENTA-COMERCIO', id_pedido_comercio: idPedido,
        descripcion_resumen: descripcion, fecha_maxima_pago: fechaMax,
        comprador: {
          ruc: '', email: email || 'sinmail@dexonpadel.com.py', ciudad: null,
          nombre, telefono: telNorm, direccion: '',
          documento: documento || '0', coordenadas: '',
          razon_social: nombre, tipo_documento: 'CI', direccion_referencia: null,
        },
        compras_items: [{
          ciudad: '1', categoria: '909', nombre: descripcion,
          cantidad: slots.length, public_key: PUBLIC_KEY, url_imagen: '',
          descripcion, id_producto: idPedido, precio_total: montoInt,
          vendedor_telefono: '', vendedor_direccion: '',
          vendedor_direccion_referencia: '', vendedor_direccion_coordenadas: '',
        }],
      }),
    });
    pagoparData = await r.json();
  } catch (e) {
    return c.json({ error: 'No se pudo contactar a Pagopar' }, 502);
  }

  if (!pagoparData?.respuesta) {
    const msg = typeof pagoparData?.resultado === 'string'
      ? pagoparData.resultado
      : pagoparData?.resultado?.[0]?.mensaje || 'Pagopar rechazó el pedido';
    return c.json({ error: msg, raw: pagoparData }, 400);
  }

  const hashPedido = pagoparData.resultado[0].data;
  const pedidoNum = pagoparData.resultado[0].pedido;

  // Buscar/crear cliente
  let cli = await buscarClientePorTel(db, telefono);
  let codigoCliente = cli?.referrer_code || null;

  if (cli && !codigoCliente) {
    codigoCliente = await genCodePersonalizado(db, nombre, telefono);
    await d1Run(db, `UPDATE clientes SET referrer_code = ? WHERE id = ?`, [codigoCliente, cli.id]);
  }

  if (!cli) {
    codigoCliente = await genCodePersonalizado(db, nombre, telefono);
    const ins = await d1First(db,
      `INSERT INTO clientes (nombre, telefono, nivel, notas, referrer_code) VALUES (?,?,?,?,?) RETURNING *`,
      [nombre.trim(), telefono.trim(), 'intermedio', 'Registrado vía Pagopar', codigoCliente]
    );
    if (!ins) return c.json({ error: 'Error guardando cliente', checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido }, 500);
    cli = ins;
  }

  // Insertar turnos
  const refNota = refMatch ? ` - Ref: ${refMatch.nombre}` : codigoRefDoc ? ` - Código: ${codigoRefDoc.codigo}` : '';
  const turnosRows = slots.map((h, i) => [
    fecha, h, 'ocasional', 'pendiente_pago', cli.id, preciosPorSlot[i], 0, preciosPorSlot[i],
    `Pago online vía Pagopar - Pedido ${pedidoNum}${refNota}`, 'pagopar',
    hashPedido, pedidoNum, idPedido,
    (refMatch || codigoRefDoc) ? refCodeNorm : null,
    (refMatch || codigoRefDoc) ? Math.round(descRef * (preciosPorSlot[i] / (subtotal || 1))) : 0,
  ]);

  const stmts = turnosRows.map(row =>
    db.prepare(`INSERT INTO turnos (fecha,hora,tipo,estado,cliente_id,precio,sena,saldo,notas,metodo_pago,pagopar_hash,pagopar_pedido_num,pagopar_id_pedido,applied_referral_code,referral_discount_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`)
      .bind(...row)
  );
  const results = await db.batch(stmts);
  if (!results.every(r => r.success)) {
    return c.json({ error: 'Error guardando turnos', checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido }, 500);
  }

  // Actualizar referidos
  const updates = [];
  if (refMatch) updates.push(db.prepare(`UPDATE clientes SET saldo_favor = MAX(0, COALESCE(saldo_favor,0) + ?) WHERE id = ?`).bind(descRef, refMatch.id).run());
  if (codigoRefDoc) updates.push(db.prepare(`UPDATE codigos_referido SET usos_actuales = COALESCE(usos_actuales,0) + ? WHERE id = ?`).bind(slots.length, codigoRefDoc.id).run());
  if (updates.length) await Promise.all(updates);

  return c.json({ ok: true, checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido, pedido: pedidoNum, referrer_code: codigoCliente });
});

// POST /pagopar/webhook
app.post('/webhook', async (c) => {
  const json = await c.req.json().catch(() => null);
  if (!json?.resultado?.[0]) return c.json({ error: 'Payload inválido' }, 400);

  const data = json.resultado[0];
  const { hash_pedido, token, pagado } = data;

  const tokenEsperado = await sha1(c.env.PAGOPAR_PRIVATE_KEY + hash_pedido);
  if (tokenEsperado !== token) return c.json({ error: 'Token no coincide' }, 401);

  const db = c.env.DB;
  const turnos = await d1All(db, `SELECT id, precio, hora, fecha, cliente_id, tipo FROM turnos WHERE pagopar_hash = ?`, [hash_pedido]);
  if (!turnos.length) return c.json(json.resultado);

  const idsTurnos = turnos.map(t => t.id);

  if (pagado === true) {
    const placeholders = idsTurnos.map(() => '?').join(',');
    await d1Run(db,
      `UPDATE turnos SET estado='reservado', pagopar_forma_pago=?, pagopar_fecha_pago=?, sena=precio, saldo=0,
       notas=? WHERE id IN (${placeholders})`,
      [data.forma_pago || 'Pago online', data.fecha_pago,
       `Pago online confirmado (${data.forma_pago}) - Comprob. ${data.numero_comprobante_interno}`,
       ...idsTurnos]
    );

    // Caja: idempotente
    const yaCaja = await d1All(db, `SELECT turno_id FROM caja WHERE turno_id IN (${placeholders}) AND tipo='ingreso'`, idsTurnos);
    const idsYa = new Set(yaCaja.map(r => r.turno_id));
    const nuevos = turnos.filter(t => !idsYa.has(t.id));
    if (nuevos.length) {
      const stmts = nuevos.map(t => db.prepare(
        `INSERT INTO caja (descripcion,tipo,categoria,monto,fecha,turno_id) VALUES (?,?,?,?,?,?)`
      ).bind(
        `Pago online (${data.forma_pago || 'Pagopar'}) - Pedido ${data.numero_pedido || hash_pedido.slice(0, 8)}`,
        'ingreso', t.tipo === 'clase' ? 'clase' : 'reserva', t.precio, t.fecha, t.id
      ));
      await db.batch(stmts);
    }

    // WhatsApp al cliente (fire & forget)
    const primerTurno = turnos[0];
    const cliente = await d1First(db, `SELECT nombre, telefono FROM clientes WHERE id = ? LIMIT 1`, [primerTurno.cliente_id]);
    if (cliente) {
      const horasStr = turnos.map(t => `${t.hora}:00`).join(' · ');
      const montoTotal = turnos.reduce((a, t) => a + t.precio, 0);
      const appUrl = c.env.APP_URL || 'https://www.dexon.com.py';
      fetch(`${appUrl}/api/whatsapp/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-secret': c.env.API_SECRET || '' },
        body: JSON.stringify({
          tipo: 'pago_confirmado', nombre: cliente.nombre, telefono: cliente.telefono,
          fecha: primerTurno.fecha, horarios: horasStr,
          monto: `Gs ${montoTotal.toLocaleString('es-PY')}`, forma_pago: data.forma_pago || 'Pago online',
        }),
      }).catch(() => {});
    }

  } else if (pagado !== true && data.fecha_pago !== null && data.cancelado !== false) {
    const placeholders = idsTurnos.map(() => '?').join(',');
    await d1Run(db, `UPDATE turnos SET estado='cancelado', notas=? WHERE id IN (${placeholders})`,
      [`Pago reversado/cancelado en Pagopar (${data.forma_pago})`, ...idsTurnos]);

    const previos = await d1All(db, `SELECT id, turno_id, monto FROM caja WHERE turno_id IN (${placeholders}) AND tipo='ingreso'`, idsTurnos);
    if (previos.length) {
      const revStmts = previos.map(m => db.prepare(`INSERT INTO caja (descripcion,tipo,categoria,monto,fecha,turno_id) VALUES (?,?,?,?,date('now'),?)`)
        .bind(`Reversión Pagopar - turno ${m.turno_id}`, 'egreso', 'reserva', m.monto, m.turno_id));
      await db.batch(revStmts);
    }
  }

  return c.json(json.resultado);
});

// GET|POST /pagopar/consultar
app.on(['GET', 'POST'], '/consultar', async (c) => {
  const url = new URL(c.req.url);
  const body = c.req.method === 'POST' ? await c.req.json().catch(() => ({})) : {};
  const hashPedido = url.searchParams.get('hash') || body?.hash;
  if (!hashPedido) return c.json({ error: 'Falta hash' }, 400);

  const PRIVATE_KEY = c.env.PAGOPAR_PRIVATE_KEY;
  const PUBLIC_KEY = c.env.PAGOPAR_PUBLIC_KEY;
  if (!PRIVATE_KEY || !PUBLIC_KEY) return c.json({ error: 'Pagopar no configurado' }, 500);

  const token = await sha1(PRIVATE_KEY + 'CONSULTA');
  try {
    const r = await fetch('https://api.pagopar.com/api/pedidos/1.1/traer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash_pedido: hashPedido, token, token_publico: PUBLIC_KEY }),
    });
    return c.json(await r.json());
  } catch {
    return c.json({ error: 'Error contactando a Pagopar' }, 502);
  }
});

export default app;
