// api/pagopar/[path].js — catch-all para todas las rutas de Pagopar
// /api/pagopar/consultar   → GET/POST consultar estado de pedido
// /api/pagopar/crear-pago  → POST iniciar transacción
// /api/pagopar/webhook     → POST notificación de pago de Pagopar

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

// ── Supabase helper (sin SDK, para crear-pago) ───────────────────────────────
async function sb(path, opts = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(url, {
    ...opts,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
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

// ── Helpers crear-pago ───────────────────────────────────────────────────────
const limpiarTexto = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tieneSecuenciaOriginal = (res, orig) => { for (let i = 0; i <= res.length - 3; i++) { if (orig.includes(res.slice(i, i + 3))) return true; } return false; };
const mezclarSinPatron = (chars, origen, intentos = 20) => { for (let i = 0; i < intentos; i++) { const m = shuffle(chars); if (!tieneSecuenciaOriginal(m.join(""), origen)) return m; } return shuffle(chars); };
const genCodigoBase = (nombre, telefono) => {
  const letras = [...limpiarTexto(nombre)]; const digitos = [...telefono.replace(/\D/g, "")];
  const pad = "XYZWQK";
  while (letras.length < 3) letras.push(pad[letras.length % pad.length]);
  while (digitos.length < 4) digitos.push(String(digitos.length % 10));
  return `${mezclarSinPatron(letras, limpiarTexto(nombre)).slice(0, 3).join("")}-${mezclarSinPatron(digitos, telefono.replace(/\D/g, "")).slice(0, 4).join("")}`;
};
const genCodePersonalizado = async (nombre, telefono) => {
  for (let i = 0; i < 10; i++) {
    const codigo = genCodigoBase(nombre, telefono);
    const check = await sb(`clientes?referrer_code=eq.${encodeURIComponent(codigo)}&select=id&limit=1`);
    if (!check.ok || !check.data?.length) return codigo;
  }
  return genCodigoBase(nombre, telefono) + Math.floor(Math.random() * 9);
};
function calcularPrecio(hora, cfg, fecha) {
  const esPico = hora >= cfg.hora_pico_inicio && hora < cfg.hora_pico_fin;
  const base = esPico ? cfg.tarifa_pico : cfg.tarifa_base;
  if (!cfg.desc_martes_jueves_enabled) return base;
  let dias = [];
  try { dias = typeof cfg.desc_martes_jueves_dias === "string" ? JSON.parse(cfg.desc_martes_jueves_dias) : (cfg.desc_martes_jueves_dias || [2, 4]); } catch { dias = [2, 4]; }
  return dias.includes(new Date(fecha + "T00:00:00").getDay()) ? Math.round(base * (1 - (Number(cfg.desc_martes_jueves_percent) || 20) / 100)) : base;
}

// ── HANDLERS ────────────────────────────────────────────────────────────────

async function handleConsultar(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const hashPedido = req.query.hash || req.body?.hash;
  if (!hashPedido) return res.status(400).json({ error: "Falta hash" });

  const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
  const PUBLIC_KEY = process.env.PAGOPAR_PUBLIC_KEY;
  const API_URL = process.env.PAGOPAR_API_URL || "https://api.pagopar.com";
  if (!PRIVATE_KEY || !PUBLIC_KEY) return res.status(500).json({ error: "Pagopar no configurado" });

  const token = sha1(PRIVATE_KEY + "CONSULTA");
  try {
    const r = await fetch(`${API_URL}/api/pedidos/1.1/traer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash_pedido: hashPedido, token, token_publico: PUBLIC_KEY }),
    });
    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(502).json({ error: "Error contactando a Pagopar" });
  }
}

async function handleCrearPago(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const PUBLIC_KEY = process.env.PAGOPAR_PUBLIC_KEY;
  const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
  const missing = ["PAGOPAR_PUBLIC_KEY", "PAGOPAR_PRIVATE_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(k => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: `Variables faltantes: ${missing.join(", ")}` });

  const { nombre, telefono, email, documento, fecha, slots, referrerCode, usarSaldo } = req.body || {};
  if (!nombre || !telefono || !fecha || !Array.isArray(slots) || slots.length === 0) return res.status(400).json({ error: "Faltan datos obligatorios" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: "Fecha inválida" });
  if (slots.some(h => !Number.isInteger(h) || h < 0 || h > 23)) return res.status(400).json({ error: "Horarios inválidos" });

  const cfgRes = await sb("config?limit=1");
  if (!cfgRes.ok || !cfgRes.data?.[0]) return res.status(500).json({ error: "No se pudo leer configuración" });
  const cfg = cfgRes.data[0];
  const refDescPct = Number(cfg.referral_discount_percent) || 10;
  const preciosPorSlot = slots.map(h => calcularPrecio(h, cfg, fecha));
  const subtotal = preciosPorSlot.reduce((a, b) => a + b, 0);

  let refMatch = null; let codigoRefDoc = null; let descPctUsado = refDescPct;
  const refCodeNorm = (referrerCode || "").trim().toUpperCase();
  if (refCodeNorm.length >= 4) {
    const rCod = await sb(`codigos_referido?codigo=eq.${encodeURIComponent(refCodeNorm)}&select=id,codigo,nombre,descuento_pct,max_usos,usos_actuales,activo&limit=1`);
    if (rCod.ok && rCod.data?.length > 0) {
      const cod = rCod.data[0];
      if (cod.activo && (cod.max_usos === null || cod.usos_actuales < cod.max_usos)) { codigoRefDoc = cod; descPctUsado = Number(cod.descuento_pct) || 10; }
    }
    if (!codigoRefDoc) {
      const r = await sb(`clientes?referrer_code=eq.${encodeURIComponent(refCodeNorm)}&select=id,nombre,telefono,saldo_favor&limit=1`);
      if (r.ok && r.data?.length > 0) {
        const m = r.data[0];
        const tNorm = telefono.replace(/\D/g, "").replace(/^(595|0)/, "").slice(-9);
        const mTNorm = (m.telefono || "").replace(/\D/g, "").replace(/^(595|0)/, "").slice(-9);
        if (mTNorm !== tNorm) refMatch = m;
      }
    }
  }
  const descRef = (refMatch || codigoRefDoc) ? Math.round(subtotal * descPctUsado / 100) : 0;
  const montoInt = Math.max(0, subtotal - descRef);

  const idPedido = `RES${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const token = sha1(PRIVATE_KEY + idPedido + String(parseFloat(montoInt)));
  const fechaMax = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
  const horasStr = slots.map(h => `${h}:00`).join(", ");
  const descripcion = `Reserva DEXON Padel - ${fecha} - ${horasStr}`;
  let telNorm = telefono.replace(/\s+/g, "");
  if (!telNorm.startsWith("+")) telNorm = telNorm.startsWith("0") ? `+595${telNorm.slice(1)}` : `+595${telNorm}`;

  const payload = {
    token, public_key: PUBLIC_KEY, monto_total: montoInt,
    tipo_pedido: "VENTA-COMERCIO", id_pedido_comercio: idPedido,
    descripcion_resumen: descripcion, fecha_maxima_pago: fechaMax,
    comprador: { ruc: "", email: email || "sinmail@dexonpadel.com.py", ciudad: null, nombre, telefono: telNorm, direccion: "", documento: documento || "0", coordenadas: "", razon_social: nombre, tipo_documento: "CI", direccion_referencia: null },
    compras_items: [{ ciudad: "1", categoria: "909", nombre: descripcion, cantidad: slots.length, public_key: PUBLIC_KEY, url_imagen: "", descripcion, id_producto: idPedido, precio_total: montoInt, vendedor_telefono: "", vendedor_direccion: "", vendedor_direccion_referencia: "", vendedor_direccion_coordenadas: "" }],
  };

  let pagoparData;
  try {
    const r = await fetch("https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), redirect: "follow" });
    pagoparData = await r.json();
  } catch (e) { return res.status(502).json({ error: "No se pudo contactar a Pagopar" }); }

  if (!pagoparData?.respuesta) {
    const msg = typeof pagoparData?.resultado === "string" ? pagoparData.resultado : pagoparData?.resultado?.[0]?.mensaje || pagoparData?.mensaje || "Pagopar rechazó el pedido";
    return res.status(400).json({ error: msg, raw: pagoparData });
  }

  const hashPedido = pagoparData.resultado[0].data;
  const pedidoNum = pagoparData.resultado[0].pedido;

  const telNorm9 = telefono.replace(/\D/g, "").replace(/^(595|0)/, "").slice(-9);
  let clienteId = null; let codigoCliente = null;
  for (const tel of [...new Set([`0${telNorm9}`, `595${telNorm9}`, telNorm9, telefono.trim()])]) {
    const enc = await sb(`clientes?telefono=eq.${encodeURIComponent(tel)}&select=id,referrer_code&limit=1`);
    if (enc.ok && enc.data?.length > 0) { clienteId = enc.data[0].id; codigoCliente = enc.data[0].referrer_code || null; break; }
  }
  if (clienteId && !codigoCliente) { codigoCliente = await genCodePersonalizado(nombre, telefono); await sb(`clientes?id=eq.${clienteId}`, { method: "PATCH", body: JSON.stringify({ referrer_code: codigoCliente }) }); }
  if (!clienteId) {
    codigoCliente = await genCodePersonalizado(nombre, telefono);
    const ins = await sb("clientes", { method: "POST", body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim(), nivel: "intermedio", notas: "Registrado vía Pagopar", referrer_code: codigoCliente }), prefer: "return=representation" });
    if (ins.ok && ins.data?.[0]?.id) { clienteId = ins.data[0].id; }
    else if (ins.status === 409) { const retry = await sb(`clientes?telefono=eq.${encodeURIComponent(telefono.trim())}&select=id,referrer_code&limit=1`); if (retry.ok && retry.data?.[0]?.id) { clienteId = retry.data[0].id; codigoCliente = retry.data[0].referrer_code || codigoCliente; } }
    if (!clienteId) return res.status(500).json({ error: "Error guardando cliente", checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido });
  }

  const refNota = refMatch ? ` - Ref: ${refMatch.nombre}` : codigoRefDoc ? ` - Código: ${codigoRefDoc.codigo}` : "";
  const turnosBody = slots.map((h, i) => ({ fecha, hora: h, tipo: "ocasional", estado: "pendiente_pago", cliente_id: clienteId, precio: preciosPorSlot[i], sena: 0, saldo: preciosPorSlot[i], notas: `Pago online vía Pagopar - Pedido ${pedidoNum}${refNota}`, metodo_pago: "pagopar", pagopar_hash: hashPedido, pagopar_pedido_num: pedidoNum, pagopar_id_pedido: idPedido, applied_referral_code: (refMatch || codigoRefDoc) ? refCodeNorm : null, referral_discount_amount: (refMatch || codigoRefDoc) ? Math.round(descRef * (preciosPorSlot[i] / (subtotal || 1))) : 0 }));
  const insTur = await sb("turnos", { method: "POST", body: JSON.stringify(turnosBody), prefer: "return=representation" });
  if (!insTur.ok) return res.status(500).json({ error: "Error guardando turnos", detail: JSON.stringify(insTur.data), checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido });

  if (refMatch) await sb(`clientes?id=eq.${refMatch.id}`, { method: "PATCH", body: JSON.stringify({ saldo_favor: (Number(refMatch.saldo_favor) || 0) + descRef }) });
  if (codigoRefDoc) await sb(`codigos_referido?id=eq.${codigoRefDoc.id}`, { method: "PATCH", body: JSON.stringify({ usos_actuales: (codigoRefDoc.usos_actuales || 0) + slots.length }) });

  return res.status(200).json({ ok: true, checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`, hash: hashPedido, pedido: pedidoNum, referrer_code: codigoCliente });
}

async function handleWebhook(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const json = req.body;
  if (!json?.resultado?.[0]) { console.error("Webhook payload inválido:", JSON.stringify(json)); return res.status(400).json({ error: "Payload inválido" }); }

  const data = json.resultado[0];
  const { hash_pedido, token, pagado } = data;
  const tokenEsperado = sha1(process.env.PAGOPAR_PRIVATE_KEY + hash_pedido);
  if (tokenEsperado !== token) { console.error("Token Pagopar inválido para hash:", hash_pedido); return res.status(401).json({ error: "Token no coincide" }); }

  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: turnos, error: errBuscar } = await client.from("turnos").select("id,precio,hora,fecha,cliente_id,tipo").eq("pagopar_hash", hash_pedido);
  if (errBuscar) return res.status(500).json({ error: "Error interno" });
  if (!turnos?.length) { console.warn("Turnos no encontrados para hash:", hash_pedido); return res.status(200).json(json.resultado); }

  const idsTurnos = turnos.map(t => t.id);

  if (pagado === true) {
    await client.from("turnos").update({ estado: "reservado", pagopar_forma_pago: data.forma_pago || "Pago online", pagopar_fecha_pago: data.fecha_pago, sena: turnos[0].precio, saldo: 0, notas: `Pago online confirmado (${data.forma_pago}) - Comprob. ${data.numero_comprobante_interno}` }).in("id", idsTurnos);
    const { data: yaRegistrados } = await client.from("caja").select("turno_id").in("turno_id", idsTurnos).eq("tipo", "ingreso");
    const idsYa = new Set((yaRegistrados || []).map(r => r.turno_id));
    const nuevosMov = turnos.filter(t => !idsYa.has(t.id)).map(t => ({ descripcion: `Pago online (${data.forma_pago || "Pagopar"}) - Pedido ${data.numero_pedido || hash_pedido.slice(0, 8)}`, tipo: "ingreso", categoria: t.tipo === "clase" ? "clase" : "reserva", monto: t.precio, fecha: t.fecha, turno_id: t.id }));
    if (nuevosMov.length > 0) await client.from("caja").insert(nuevosMov);

    const primerTurno = turnos[0];
    const { data: cliente } = await client.from("clientes").select("nombre,telefono").eq("id", primerTurno.cliente_id).single();
    if (cliente) {
      const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.dexon.com.py";
      fetch(`${host}/api/whatsapp/enviar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "pago_confirmado", nombre: cliente.nombre, telefono: cliente.telefono, fecha: primerTurno.fecha, horarios: turnos.map(t => `${t.hora}:00`).join(" · "), monto: `Gs ${turnos.reduce((a, t) => a + t.precio, 0).toLocaleString("es-PY")}`, forma_pago: data.forma_pago || "Pago online" }) }).catch(e => console.error("[pagopar webhook] Error WA:", e));
    }
  } else if (pagado !== false || data.fecha_pago !== null || data.cancelado) {
    await client.from("turnos").update({ estado: "cancelado", notas: `Pago reversado/cancelado en Pagopar (${data.forma_pago})` }).in("id", idsTurnos);
    const { data: ingresosPrevios } = await client.from("caja").select("id,turno_id,monto").in("turno_id", idsTurnos).eq("tipo", "ingreso");
    if (ingresosPrevios?.length > 0) await client.from("caja").insert(ingresosPrevios.map(m => ({ descripcion: `Reversión Pagopar - turno ${m.turno_id}`, tipo: "egreso", categoria: "reserva", monto: m.monto, fecha: new Date().toISOString().slice(0, 10), turno_id: m.turno_id })));
  }

  return res.status(200).json(json.resultado);
}

// ── ROUTER ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const path = req.query.path;
  if (path === "consultar")  return handleConsultar(req, res);
  if (path === "crear-pago") return handleCrearPago(req, res);
  if (path === "webhook")    return handleWebhook(req, res);
  return res.status(404).json({ error: `Ruta pagopar/${path} no encontrada` });
}
