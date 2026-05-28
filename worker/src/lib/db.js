// Helpers de D1: query builder compatible con sintaxis PostgREST
// Soporta: col=eq/neq/gt/gte/lt/lte/like/ilike/is/in, order, select, limit, offset

const OPS = {
  eq:    (col, v) => [`"${col}" = ?`,   [coerce(v)]],
  neq:   (col, v) => [`"${col}" != ?`,  [coerce(v)]],
  gt:    (col, v) => [`"${col}" > ?`,   [v]],
  gte:   (col, v) => [`"${col}" >= ?`,  [v]],
  lt:    (col, v) => [`"${col}" < ?`,   [v]],
  lte:   (col, v) => [`"${col}" <= ?`,  [v]],
  like:  (col, v) => [`"${col}" LIKE ?`, [v]],
  ilike: (col, v) => [`"${col}" LIKE ? COLLATE NOCASE`, [v]],
  is:    (col, v) => v === 'null' ? [`"${col}" IS NULL`, []] : [`"${col}" IS NOT NULL`, []],
  in:    (col, v) => {
    const vals = v.replace(/^\(|\)$/g, '').split(',').map(x => x.trim());
    return [`"${col}" IN (${vals.map(() => '?').join(',')})`, vals];
  },
};

function coerce(v) {
  if (v === 'true') return 1;
  if (v === 'false') return 0;
  if (v === 'null') return null;
  return v;
}

function validCol(col) {
  return /^\w+$/.test(col);
}

export function buildSelect(table, searchParams) {
  const where = [];
  const params = [];
  let orderBy = '';
  let selectCols = '*';
  let limit = 2000;
  let offset = 0;

  for (const [key, value] of searchParams.entries()) {
    if (key === 'select') {
      const cols = value.split(',').map(c => c.trim()).filter(c => /^\w+$/.test(c));
      if (cols.length) selectCols = cols.map(c => `"${c}"`).join(', ');
      continue;
    }
    if (key === 'order') {
      const parts = value.split(',').flatMap(p => {
        const [col, dir] = p.trim().split('.');
        if (!validCol(col)) return [];
        return [`"${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`];
      });
      if (parts.length) orderBy = `ORDER BY ${parts.join(', ')}`;
      continue;
    }
    if (key === 'limit') { limit = Math.min(parseInt(value) || 2000, 5000); continue; }
    if (key === 'offset') { offset = parseInt(value) || 0; continue; }

    const dotIdx = value.indexOf('.');
    if (dotIdx === -1 || !validCol(key)) continue;
    const op = value.slice(0, dotIdx);
    const val = value.slice(dotIdx + 1);
    if (!OPS[op]) continue;
    const [clause, clauseParams] = OPS[op](key, val);
    where.push(clause);
    params.push(...clauseParams);
  }

  const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT ${selectCols} FROM "${table}" ${whereStr} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
  return { sql, params };
}

export function buildInsert(table, body) {
  const cols = Object.keys(body).filter(validCol);
  const vals = cols.map(c => body[c] === true ? 1 : body[c] === false ? 0 : body[c]);
  const sql = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING *`;
  return { sql, params: vals };
}

export function buildUpdate(table, id, body) {
  const cols = Object.keys(body).filter(c => validCol(c) && c !== 'id');
  if (!cols.length) return null;
  const vals = cols.map(c => body[c] === true ? 1 : body[c] === false ? 0 : body[c]);
  const sql = `UPDATE "${table}" SET ${cols.map(c => `"${c}" = ?`).join(', ')} WHERE "id" = ? RETURNING *`;
  return { sql, params: [...vals, id] };
}

export function buildDelete(table, id) {
  return { sql: `DELETE FROM "${table}" WHERE "id" = ?`, params: [id] };
}

// Extrae id de query params estilo PostgREST: ?id=eq.123
export function extractIdFromParams(searchParams) {
  const v = searchParams.get('id');
  if (!v) return null;
  const match = v.match(/^eq\.(.+)$/);
  return match ? match[1] : null;
}

// Helper para ejecutar con D1 y devolver array
export async function d1All(db, sql, params = []) {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const { results } = await stmt.all();
  return results || [];
}

export async function d1First(db, sql, params = []) {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  return stmt.first();
}

export async function d1Run(db, sql, params = []) {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  return stmt.run();
}
