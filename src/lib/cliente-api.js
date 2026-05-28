// src/lib/cliente-api.js
// Helpers para el portal "Mi cuenta" — invocan los endpoints /api/cliente/*
// Usa el mismo patrón que src/lib/api.js (no Supabase JS directo desde el browser).

const BASE = import.meta.env.VITE_WORKER_URL || '';

const TOKEN_KEY = "dx_cliente_token";
const CLIENTE_KEY = "dx_cliente";

export const clienteSession = {
  get: () => {
    try {
      const tk = localStorage.getItem(TOKEN_KEY);
      const cli = JSON.parse(localStorage.getItem(CLIENTE_KEY) || "null");
      return tk && cli ? { token: tk, cliente: cli } : null;
    } catch { return null; }
  },
  set: (token, cliente) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CLIENTE_KEY);
  },
};

async function call(path, opts = {}) {
  const sess = clienteSession.get();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (sess?.token) headers.Authorization = `Bearer ${sess.token}`;
  const r = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error(data?.error || `Error ${r.status}`);
  return data;
}

// ── AUTH ────────────────────────────────────────────────
export const clienteAuth = {
  sendCode: (telefono) =>
    call("/api/cliente/auth-send", { method: "POST", body: JSON.stringify({ telefono }) }),

  verifyCode: ({ telefono, codigo, nombre, apellido, codigo_referido }) =>
    call("/api/cliente/auth-verify", {
      method: "POST",
      body: JSON.stringify({ telefono, codigo, nombre, apellido, codigo_referido }),
    }).then(d => {
      clienteSession.set(d.token, d.cliente);
      return d;
    }),

  logout: () => { clienteSession.clear(); },
};

// ── DATA ────────────────────────────────────────────────
export const clienteData = {
  // Toda la data de "Mi cuenta" en una sola llamada
  me: () => call("/api/cliente/me"),

  // Slots disponibles para reagendar / reservar (rango de fechas)
  disponibilidad: (fecha) =>
    call(`/api/cliente/disponibilidad?fecha=${fecha}`),

  // Acciones sobre turno propio
  cancelarTurno: (turno_id) =>
    call("/api/cliente/turno-accion", {
      method: "POST",
      body: JSON.stringify({ accion: "cancelar", turno_id }),
    }),

  reagendarTurno: (turno_id, nuevo_inicio, nueva_duracion) =>
    call("/api/cliente/turno-accion", {
      method: "POST",
      body: JSON.stringify({ accion: "reagendar", turno_id, nuevo_inicio, nueva_duracion }),
    }),

  // Crear nuevo turno — reutiliza el flujo existente /api/reservar.js
  // (ese endpoint ya maneja descuentos, referidos, pagopar/transferencia).
  reservar: (payload) =>
    call("/api/reservar", { method: "POST", body: JSON.stringify(payload) }),

  // Perfil
  updatePerfil: (campos) =>
    call("/api/cliente/perfil", { method: "PATCH", body: JSON.stringify(campos) }),

  updateNotif: (notif) =>
    call("/api/cliente/notif", { method: "PATCH", body: JSON.stringify(notif) }),

  // Favoritos
  addFavorito: (fav) =>
    call("/api/cliente/favoritos", { method: "POST", body: JSON.stringify(fav) }),
  delFavorito: (id) =>
    call(`/api/cliente/favoritos?id=${id}`, { method: "DELETE" }),
};
