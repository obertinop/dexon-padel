import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin.js';
import { buildSelect, buildInsert, buildUpdate, buildDelete, extractIdFromParams, d1All, d1First, d1Run } from '../lib/db.js';

const app = new Hono();

// Tablas permitidas via admin CRUD
const ADMIN_TABLES = new Set([
  'config', 'clientes', 'turnos', 'caja', 'abonos', 'planes',
  'instructores', 'stock', 'abono_turnos', 'codigos_referido',
  'whatsapp_mensajes', 'dias_bloqueados', 'turno_items',
]);

// Tablas públicas (solo lectura, sin auth)
const PUBLIC_TABLES = new Set(['config', 'turnos', 'dias_bloqueados', 'codigos_referido']);

// Columnas expuestas públicamente por tabla
const PUBLIC_COLS = {
  turnos: ['fecha', 'hora', 'estado', 'tipo'],
  config: null, // todas
  dias_bloqueados: null,
  codigos_referido: ['codigo', 'nombre', 'descuento_pct', 'activo'],
};

function guardTable(table, c, requireAdmin = false) {
  const hasAdmin = c.get('admin');
  if (!ADMIN_TABLES.has(table)) return c.json({ error: 'Tabla no encontrada' }, 404);
  if (requireAdmin && !hasAdmin) return c.json({ error: 'No autorizado' }, 401);
  return null;
}

// Middleware condicional: intenta admin auth pero no falla si no hay token
async function tryAdminAuth(c, next) {
  const auth = c.req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    const { verifyJWT } = await import('../lib/auth.js');
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) c.set('admin', payload);
  }
  await next();
}

// GET /v1/:table?filters
app.get('/:table', tryAdminAuth, async (c) => {
  const table = c.req.param('table');
  const hasAdmin = c.get('admin');

  if (!ADMIN_TABLES.has(table)) return c.json({ error: 'Tabla no encontrada' }, 404);

  // Sin auth solo se permiten tablas públicas
  if (!hasAdmin && !PUBLIC_TABLES.has(table)) return c.json([], 200);

  const url = new URL(c.req.url);

  // Para abono_turnos públicos: join con abonos activos
  if (!hasAdmin && table === 'abono_turnos') {
    const dia = url.searchParams.get('dia');
    const diaFilter = dia ? `AND at.dia = ?` : '';
    const params = dia ? [parseInt(dia)] : [];
    const rows = await d1All(
      c.env.DB,
      `SELECT at.dia, at.hora FROM abono_turnos at
       INNER JOIN abonos ab ON ab.id = at.abono_id
       WHERE ab.estado = 'activo' AND (ab.fecha_vencimiento IS NULL OR ab.fecha_vencimiento >= date('now'))
       ${diaFilter}`,
      params
    );
    return c.json(rows);
  }

  let { sql, params } = buildSelect(table, url.searchParams);

  // Restringe columnas para acceso público
  if (!hasAdmin && PUBLIC_COLS[table]) {
    const cols = PUBLIC_COLS[table].map(c => `"${c}"`).join(', ');
    sql = sql.replace(/^SELECT \*/, `SELECT ${cols}`);
  }

  const rows = await d1All(c.env.DB, sql, params);
  return c.json(rows);
});

// POST /v1/:table
app.post('/:table', adminAuth, async (c) => {
  const table = c.req.param('table');
  const err = guardTable(table, c, true);
  if (err) return err;

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Body inválido' }, 400);

  const db = c.env.DB;

  // Soporte para inserción de array (múltiples filas)
  if (Array.isArray(body)) {
    if (body.length === 0) return c.json([]);
    const stmts = body.map(row => {
      const { sql, params } = buildInsert(table, row);
      return params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
    });
    const results = await db.batch(stmts);
    const rows = results.flatMap(r => r.results || []);
    return c.json(rows, 201);
  }

  const { sql, params } = buildInsert(table, body);
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const { results } = await stmt.all();
  return c.json(results?.[0] || {}, 201);
});

// PATCH /v1/:table/:id  o  PATCH /v1/:table?id=eq.N
app.patch('/:table/:id', adminAuth, async (c) => {
  return handlePatch(c, c.req.param('id'));
});
app.patch('/:table', adminAuth, async (c) => {
  const id = extractIdFromParams(new URL(c.req.url).searchParams);
  if (!id) return c.json({ error: 'Falta id' }, 400);
  return handlePatch(c, id);
});

async function handlePatch(c, id) {
  const table = c.req.param('table');
  const err = guardTable(table, c, true);
  if (err) return err;

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Body inválido' }, 400);

  const built = buildUpdate(table, id, body);
  if (!built) return c.json({ error: 'Nada para actualizar' }, 400);

  const { sql, params } = built;
  const stmt = c.env.DB.prepare(sql).bind(...params);
  const { results } = await stmt.all();
  return c.json(results?.[0] || {});
}

// DELETE /v1/:table/:id  o  DELETE /v1/:table?id=eq.N
app.delete('/:table/:id', adminAuth, async (c) => {
  return handleDelete(c, c.req.param('id'));
});
app.delete('/:table', adminAuth, async (c) => {
  const id = extractIdFromParams(new URL(c.req.url).searchParams);
  if (!id) return c.json({ error: 'Falta id' }, 400);
  return handleDelete(c, id);
});

async function handleDelete(c, id) {
  const table = c.req.param('table');
  const err = guardTable(table, c, true);
  if (err) return err;

  const { sql, params } = buildDelete(table, id);
  await d1Run(c.env.DB, sql, params);
  return c.json({ ok: true });
}

export default app;
