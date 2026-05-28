import { WORKER_URL } from './constants.js';

// ── AUTH ──
export const auth = {
  login: async (email, pw) => {
    const r = await fetch(`${WORKER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Credenciales incorrectas');
    return d;
  },
  logout: async (token) => {
    await fetch(`${WORKER_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  },
};

// ── DB ──
export const api = async (path, opts = {}, token) => {
  const { prefer: _prefer, ...restOpts } = opts;
  const r = await fetch(`${WORKER_URL}/api/v1/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...restOpts,
  });
  if (!r.ok) throw new Error(await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

export const db = {
  get:   (t, p, tk)    => api(`${t}?${p || ''}`, {}, tk),
  post:  (t, b, tk)    => api(t, { method: 'POST', body: JSON.stringify(b) }, tk),
  patch: (t, id, b, tk) => api(`${t}/${id}`, { method: 'PATCH', body: JSON.stringify(b) }, tk),
  del:   (t, id, tk)   => api(`${t}/${id}`, { method: 'DELETE' }, tk),
};
