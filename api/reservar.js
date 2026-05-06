// /api/reservar.js
// Maneja reservas por transferencia bancaria completamente server-side.
// Calcula el total real, valida el código de referido, crea cliente y turnos.
import crypto from "crypto";

const genCode = () => {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "REF-";
  for (let i = 0; i < 8; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
};

async function sb(path, opts = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(url, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
      ...(opts.headers || {}),
    },
  });
  const txt = await r.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

// Calcula el precio de un slot con descuento del día si aplica
function calcularPrecio(hora, cfg) {
  const esPico = hora >= cfg.hora_pico_inicio && hora < cfg.hora_pico_fin;
  const base = esPico ? cfg.tarifa_pico : cfg.tarifa_base;
  if (!cfg.desc_martes_jueves_enabled) return base;
  let dias = [];
  try { dias = typeof cfg.desc_martes_jueves_dias === "string" ? JSON.parse(cfg.desc_martes_jueves_dias) : (cfg.desc_martes_jueves_dias || [2, 4]); } catch { dias = [2, 4]; }
  return dias.includes(new Date(cfg._fecha + "T00:00:00").getDay())
    ? Math.round(base * (1 - (Number(cfg.desc_martes_jueves_percent) || 20) / 100))
    : base;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Variables de entorno faltantes" });
  }

  // ── 1. Validar payload ───────────────────────────────────────────────────
  const { nombre, telefono, fecha, slots, referrerCode, usarSaldo } = req.body || {};
  if (!nombre?.trim() || !telefono?.trim() || !fecha || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Fecha inválida" });
  }
  if (slots.some(h => !Number.isInteger(h) || h < 0 || h > 23)) {
    return res.status(400).json({ error: "Horarios inválidos" });
  }

  // ── 2. Leer config para calcular precios ─────────────────────────────────
  const cfgRes = await sb("config?limit=1");
  if (!cfgRes.ok || !cfgRes.data?.[0]) {
    return res.status(500).json({ error: "No se pudo leer la configuración" });
  }
  const cfg = { ...cfgRes.data[0], _fecha: fecha };
  const refDescPct = Number(cfg.referral_discount_percent) || 10;

  // ── 3. Calcular total real server-side ───────────────────────────────────
  const preciosPorSlot = slots.map(h => calcularPrecio(h, cfg));
  const subtotal = preciosPorSlot.reduce((a, b) => a + b, 0);

  // ── 4. Validar código de referido ────────────────────────────────────────
  let refMatch = null;
  const refCodeNorm = (referrerCode || "").trim().toUpperCase();
  if (refCodeNorm.length >= 4) {
    const r = await sb(`clientes?referrer_code=eq.${encodeURIComponent(refCodeNorm)}&select=id,nombre,telefono,saldo_favor&limit=1`);
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const m = r.data[0];
      const tNorm = telefono.replace(/\D/g, "").replace(/^(595|0)/, "").slice(-9);
      const mTNorm = (m.telefono || "").replace(/\D/g, "").replace(/^(595|0)/, "").slice(-9);
      if (mTNorm !== tNorm) refMatch = m;
    }
  }
  const descRef = refMatch ? Math.round(subtotal * refDescPct / 100) : 0;

  // ── 5. Buscar/crear cliente ───────────────────────────────────────────────
  const telNorm9 = telefono.replace(/\D/g, "").replace(/^(595|0)/, "").slice(-9);
  let clienteId = null;
  let codigoCliente = null;
  let saldoCliente = 0;

  // Buscar por múltiples formatos de teléfono
  const formatos = [`0${telNorm9}`, `595${telNorm9}`, telNorm9, telefono.trim()];
  for (const tel of [...new Set(formatos)]) {
    const r = await sb(`clientes?telefono=eq.${encodeURIComponent(tel)}&select=id,referrer_code,saldo_favor&limit=1`);
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      clienteId = r.data[0].id;
      codigoCliente = r.data[0].referrer_code || null;
      saldoCliente = Number(r.data[0].saldo_favor) || 0;
      break;
    }
  }

  // Nuevo cliente
  if (!clienteId) {
    codigoCliente = genCode();
    const ins = await sb("clientes", {
      method: "POST",
      body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim(), nivel: "intermedio", notas: "Registrado desde portal", referrer_code: codigoCliente }),
      prefer: "return=representation",
    });
    if (ins.ok && ins.data?.[0]?.id) {
      clienteId = ins.data[0].id;
    } else {
      // Puede ser conflicto de unicidad — buscar de nuevo
      const retry = await sb(`clientes?telefono=eq.${encodeURIComponent(telefono.trim())}&select=id,referrer_code,saldo_favor&limit=1`);
      if (retry.ok && retry.data?.[0]?.id) {
        clienteId = retry.data[0].id;
        codigoCliente = retry.data[0].referrer_code || codigoCliente;
        saldoCliente = Number(retry.data[0].saldo_favor) || 0;
      } else {
        return res.status(500).json({ error: "Error guardando cliente", detail: JSON.stringify(ins.data) });
      }
    }
  }

  // Generar código si no tiene
  if (clienteId && !codigoCliente) {
    codigoCliente = genCode();
    await sb(`clientes?id=eq.${clienteId}`, { method: "PATCH", body: JSON.stringify({ referrer_code: codigoCliente }) });
  }

  // ── 6. Calcular descuento de saldo ───────────────────────────────────────
  const descSaldo = usarSaldo ? Math.min(saldoCliente, subtotal - descRef) : 0;
  const totalFinal = Math.max(0, subtotal - descRef - descSaldo);

  // ── 7. Guardar turnos ────────────────────────────────────────────────────
  const nota = "Comprobante enviado vía WhatsApp - Pendiente confirmación";
  const turnosBody = slots.map((h, i) => ({
    fecha, hora: h, tipo: "ocasional", estado: "pendiente_pago",
    cliente_id: clienteId,
    precio: preciosPorSlot[i],
    sena: 0, saldo: preciosPorSlot[i],
    notas: nota,
    metodo_pago: "transferencia",
    day_discount_amount: calcularPrecio(h, { ...cfg, desc_martes_jueves_enabled: false }) - preciosPorSlot[i],
    applied_referral_code: refMatch ? refCodeNorm : null,
    referral_discount_amount: refMatch ? Math.round(descRef * (preciosPorSlot[i] / (subtotal || 1))) : 0,
  }));

  const insTur = await sb("turnos", { method: "POST", body: JSON.stringify(turnosBody), prefer: "return=representation" });
  if (!insTur.ok) {
    return res.status(500).json({ error: "Error guardando turnos", detail: JSON.stringify(insTur.data) });
  }

  // ── 8. Actualizar saldos (referente gana, cliente gasta) ─────────────────
  const updates = [];

  if (refMatch) {
    updates.push(sb(`clientes?id=eq.${refMatch.id}`, {
      method: "PATCH",
      body: JSON.stringify({ saldo_favor: (Number(refMatch.saldo_favor) || 0) + descRef }),
    }));
  }
  if (descSaldo > 0) {
    updates.push(sb(`clientes?id=eq.${clienteId}`, {
      method: "PATCH",
      body: JSON.stringify({ saldo_favor: Math.max(0, saldoCliente - descSaldo) }),
    }));
  }
  await Promise.all(updates);

  return res.status(200).json({
    ok: true,
    total: totalFinal,
    referrer_code: codigoCliente,
    saldo_restante: Math.max(0, saldoCliente - descSaldo),
  });
}
