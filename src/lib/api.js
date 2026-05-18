import { SUPA_URL, SUPA_KEY } from "./constants.js";

// ── AUTH ──
export const auth = {
  login: async (email, pw) => {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{ apikey:SUPA_KEY, "Content-Type":"application/json" },
      body: JSON.stringify({ email, password:pw }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description||"Credenciales incorrectas");
    return d;
  },
  logout: async (token) => {
    await fetch(`${SUPA_URL}/auth/v1/logout`, { method:"POST", headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${token}` } });
  },
};

// ── DB ──
export const api = async (path, opts={}, token) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${token||SUPA_KEY}`, "Content-Type":"application/json", ...(opts.prefer?{Prefer:opts.prefer}:{}) },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
export const db = {
  get: (t,p,tk) => api(`${t}?${p||""}`,{},tk),
  post: (t,b,tk) => api(t,{method:"POST",body:JSON.stringify(b),prefer:"return=representation"},tk),
  patch: (t,id,b,tk) => api(`${t}?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(b),prefer:"return=representation"},tk),
  del: (t,id,tk) => api(`${t}?id=eq.${id}`,{method:"DELETE"},tk),
};
