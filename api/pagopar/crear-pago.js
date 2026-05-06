// /api/pagopar/crear-pago.js
import crypto from "crypto";

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
const genCode = () => { const c="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let r="REF-"; for(let i=0;i<8;i++)r+=c[Math.floor(Math.random()*c.length)]; return r; };

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

function calcularPrecio(hora, cfg, fecha) {
  const esPico = hora >= cfg.hora_pico_inicio && hora < cfg.hora_pico_fin;
  const base = esPico ? cfg.tarifa_pico : cfg.tarifa_base;
  if (!cfg.desc_martes_jueves_enabled) return base;
  let dias = [];
  try { dias = typeof cfg.desc_martes_jueves_dias === "string" ? JSON.parse(cfg.desc_martes_jueves_dias) : (cfg.desc_martes_jueves_dias || [2,4]); } catch { dias = [2,4]; }
  return dias.includes(new Date(fecha + "T00:00:00").getDay())
    ? Math.round(base * (1 - (Number(cfg.desc_martes_jueves_percent) || 20) / 100))
    : base;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const PUBLIC_KEY  = process.env.PAGOPAR_PUBLIC_KEY;
  const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
  const missing = ["PAGOPAR_PUBLIC_KEY","PAGOPAR_PRIVATE_KEY","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"].filter(k => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: `Variables faltantes: ${missing.join(", ")}` });

  // ── 1. Validar payload ───────────────────────────────────────────────────
  const { nombre, telefono, email, documento, fecha, slots, referrerCode, usarSaldo } = req.body || {};
  if (!nombre || !telefono || !fecha || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: "Fecha inválida" });
  if (slots.some(h => !Number.isInteger(h) || h < 0 || h > 23)) return res.status(400).json({ error: "Horarios inválidos" });

  // ── 2. Leer config y calcular total server-side ──────────────────────────
  const cfgRes = await sb("config?limit=1");
  if (!cfgRes.ok || !cfgRes.data?.[0]) return res.status(500).json({ error: "No se pudo leer configuración" });
  const cfg = cfgRes.data[0];
  const refDescPct = Number(cfg.referral_discount_percent) || 10;
  const preciosPorSlot = slots.map(h => calcularPrecio(h, cfg, fecha));
  const subtotal = preciosPorSlot.reduce((a, b) => a + b, 0);

  // ── 3. Validar código de referido ────────────────────────────────────────
  let refMatch = null;
  const refCodeNorm = (referrerCode || "").trim().toUpperCase();
  if (refCodeNorm.length >= 4) {
    const r = await sb(`clientes?referrer_code=eq.${encodeURIComponent(refCodeNorm)}&select=id,nombre,telefono,saldo_favor&limit=1`);
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const m = r.data[0];
      const tNorm = telefono.replace(/\D/g,"").replace(/^(595|0)/,"").slice(-9);
      const mTNorm = (m.telefono||"").replace(/\D/g,"").replace(/^(595|0)/,"").slice(-9);
      if (mTNorm !== tNorm) refMatch = m;
    }
  }
  const descRef = refMatch ? Math.round(subtotal * refDescPct / 100) : 0;
  const montoInt = Math.max(0, subtotal - descRef);

  // ── 4. Llamar a Pagopar con el total calculado server-side ───────────────
  const idPedido = `RES${Date.now()}${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const token = sha1(PRIVATE_KEY + idPedido + String(parseFloat(montoInt)));
  const fechaMax = new Date(Date.now() + 30*60*1000).toISOString().replace("T"," ").slice(0,19);
  const horasStr = slots.map(h => `${h}:00`).join(", ");
  const descripcion = `Reserva DEXON Padel - ${fecha} - ${horasStr}`;

  let telNorm = telefono.replace(/\s+/g,"");
  if (!telNorm.startsWith("+")) telNorm = telNorm.startsWith("0") ? `+595${telNorm.slice(1)}` : `+595${telNorm}`;

  const payload = {
    token, public_key: PUBLIC_KEY, monto_total: montoInt,
    tipo_pedido: "VENTA-COMERCIO", id_pedido_comercio: idPedido,
    descripcion_resumen: descripcion, fecha_maxima_pago: fechaMax,
    comprador: {
      ruc: "", email: email || "sinmail@dexonpadel.com.py", ciudad: null,
      nombre, telefono: telNorm, direccion: "",
      documento: documento || "0", coordenadas: "",
      razon_social: nombre, tipo_documento: "CI", direccion_referencia: null,
    },
    compras_items: [{
      ciudad: "1", categoria: "909", nombre: descripcion,
      cantidad: slots.length, public_key: PUBLIC_KEY, url_imagen: "",
      descripcion, id_producto: idPedido, precio_total: montoInt,
      vendedor_telefono: "", vendedor_direccion: "",
      vendedor_direccion_referencia: "", vendedor_direccion_coordenadas: "",
    }],
  };

  let pagoparData;
  try {
    const r = await fetch("https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), redirect: "follow",
    });
    pagoparData = await r.json();
    console.log("[pagopar] HTTP", r.status, JSON.stringify(pagoparData));
  } catch (e) {
    return res.status(502).json({ error: "No se pudo contactar a Pagopar" });
  }

  if (!pagoparData?.respuesta) {
    const msg = typeof pagoparData?.resultado === "string"
      ? pagoparData.resultado
      : pagoparData?.resultado?.[0]?.mensaje || pagoparData?.mensaje || "Pagopar rechazó el pedido";
    return res.status(400).json({ error: msg, raw: pagoparData });
  }

  const hashPedido = pagoparData.resultado[0].data;
  const pedidoNum  = pagoparData.resultado[0].pedido;

  // ── 5. Buscar/crear cliente ───────────────────────────────────────────────
  const telNorm9 = telefono.replace(/\D/g,"").replace(/^(595|0)/,"").slice(-9);
  let clienteId = null;
  let codigoCliente = null;

  for (const tel of [...new Set([`0${telNorm9}`, `595${telNorm9}`, telNorm9, telefono.trim()])]) {
    const enc = await sb(`clientes?telefono=eq.${encodeURIComponent(tel)}&select=id,referrer_code&limit=1`);
    if (enc.ok && Array.isArray(enc.data) && enc.data.length > 0) {
      clienteId = enc.data[0].id;
      codigoCliente = enc.data[0].referrer_code || null;
      break;
    }
  }

  if (clienteId && !codigoCliente) {
    codigoCliente = genCode();
    await sb(`clientes?id=eq.${clienteId}`, { method: "PATCH", body: JSON.stringify({ referrer_code: codigoCliente }) });
  }

  if (!clienteId) {
    codigoCliente = genCode();
    const ins = await sb("clientes", {
      method: "POST",
      body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim(), nivel: "intermedio", notas: "Registrado vía Pagopar", referrer_code: codigoCliente }),
      prefer: "return=representation",
    });
    if (ins.ok && ins.data?.[0]?.id) {
      clienteId = ins.data[0].id;
    } else if (ins.status === 409) {
      const retry = await sb(`clientes?telefono=eq.${encodeURIComponent(telefono.trim())}&select=id,referrer_code&limit=1`);
      if (retry.ok && retry.data?.[0]?.id) { clienteId = retry.data[0].id; codigoCliente = retry.data[0].referrer_code || codigoCliente; }
    }
    if (!clienteId) return res.status(500).json({ error: "Error guardando cliente", checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido });
  }

  // ── 6. Guardar turnos ────────────────────────────────────────────────────
  const turnosBody = slots.map((h, i) => ({
    fecha, hora: h, tipo: "ocasional", estado: "pendiente_pago",
    cliente_id: clienteId, precio: preciosPorSlot[i], sena: 0, saldo: preciosPorSlot[i],
    notas: `Pago online vía Pagopar - Pedido ${pedidoNum}${refMatch ? ` - Ref: ${refMatch.nombre}` : ""}`,
    metodo_pago: "pagopar",
    pagopar_hash: hashPedido, pagopar_pedido_num: pedidoNum, pagopar_id_pedido: idPedido,
    applied_referral_code: refMatch ? refCodeNorm : null,
    referral_discount_amount: refMatch ? Math.round(descRef * (preciosPorSlot[i] / (subtotal || 1))) : 0,
  }));

  const insTur = await sb("turnos", { method: "POST", body: JSON.stringify(turnosBody), prefer: "return=representation" });
  if (!insTur.ok) {
    return res.status(500).json({ error: "Error guardando turnos", detail: JSON.stringify(insTur.data), checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido });
  }

  // ── 7. Actualizar saldo del referente ────────────────────────────────────
  if (refMatch) {
    await sb(`clientes?id=eq.${refMatch.id}`, {
      method: "PATCH",
      body: JSON.stringify({ saldo_favor: (Number(refMatch.saldo_favor) || 0) + descRef }),
    });
  }

  return res.status(200).json({
    ok: true,
    checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`,
    hash: hashPedido,
    pedido: pedidoNum,
    referrer_code: codigoCliente,
  });
}
