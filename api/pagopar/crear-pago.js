// /api/pagopar/crear-pago.js
// Crea un pedido en Pagopar y guarda los turnos pendientes en Supabase.
// Usa fetch directo a PostgREST (igual que el frontend) para máxima compatibilidad.
import crypto from "crypto";

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

// Helper para llamar a PostgREST con la service role key (bypassa RLS)
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // ── 1. Validar variables de entorno ──────────────────────────────────────
  const PUBLIC_KEY  = process.env.PAGOPAR_PUBLIC_KEY;
  const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
  const SB_URL      = process.env.SUPABASE_URL;
  const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [];
  if (!PUBLIC_KEY)  missing.push("PAGOPAR_PUBLIC_KEY");
  if (!PRIVATE_KEY) missing.push("PAGOPAR_PRIVATE_KEY");
  if (!SB_URL)      missing.push("SUPABASE_URL");
  if (!SB_KEY)      missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    return res.status(500).json({ error: `Variables faltantes en Vercel: ${missing.join(", ")}` });
  }

  // ── 2. Validar payload ───────────────────────────────────────────────────
  const { nombre, telefono, email, documento, fecha, slots, total } = req.body || {};
  if (!nombre || !telefono || !fecha || !Array.isArray(slots) || slots.length === 0 || !total) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  // ── 3. Llamar a Pagopar ──────────────────────────────────────────────────
  const idPedido = `RES${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const montoInt = parseInt(total, 10);
  const token    = sha1(PRIVATE_KEY + idPedido + String(parseFloat(montoInt)));

  const fechaMax = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
  const horasStr = slots.map(h => `${h}:00`).join(", ");
  const descripcion = `Reserva DEXON Padel - ${fecha} - ${horasStr}`;

  let telNorm = telefono.replace(/\s+/g, "");
  if (!telNorm.startsWith("+")) {
    telNorm = telNorm.startsWith("0") ? `+595${telNorm.slice(1)}` : `+595${telNorm}`;
  }

  const payload = {
    token,
    public_key:          PUBLIC_KEY,
    monto_total:         montoInt,
    tipo_pedido:         "VENTA-COMERCIO",
    id_pedido_comercio:  idPedido,
    descripcion_resumen: descripcion,
    fecha_maxima_pago:   fechaMax,
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    pagoparData = await r.json();
    console.log("[pagopar] HTTP", r.status, "respuesta:", JSON.stringify(pagoparData));
  } catch (e) {
    console.error("[pagopar] Error de red:", e);
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

  // ── 4. Buscar/crear cliente en Supabase ──────────────────────────────────
  const telLimpio = telefono.replace(/\D/g, "");
  let clienteId = null;

  // Intentar encontrar por teléfono original o limpio
  for (const tel of [telefono.trim(), telLimpio]) {
    if (!tel) continue;
    const enc = await sb(`clientes?telefono=eq.${encodeURIComponent(tel)}&select=id&limit=1`);
    if (enc.ok && Array.isArray(enc.data) && enc.data.length > 0) {
      clienteId = enc.data[0].id;
      break;
    }
  }

  // Si no existe, crearlo. Intentar primero con todos los campos, luego mínimos.
  if (!clienteId) {
    const intentos = [
      { nombre: nombre.trim(), telefono: telefono.trim(), nivel: "intermedio", notas: "Registrado vía Pagopar" },
      { nombre: nombre.trim(), telefono: telefono.trim() },
    ];
    let lastErr = null;
    for (const body of intentos) {
      const ins = await sb("clientes", {
        method: "POST", body: JSON.stringify(body), prefer: "return=representation",
      });
      if (ins.ok && Array.isArray(ins.data) && ins.data[0]?.id) {
        clienteId = ins.data[0].id;
        break;
      }
      lastErr = ins;
      console.error("[supabase] insert clientes falló:", ins.status, JSON.stringify(ins.data));
      // Si es conflicto de unicidad, buscar otra vez
      if (ins.status === 409) {
        const reintento = await sb(`clientes?telefono=eq.${encodeURIComponent(telefono.trim())}&select=id&limit=1`);
        if (reintento.ok && reintento.data?.[0]?.id) { clienteId = reintento.data[0].id; break; }
      }
    }
    if (!clienteId) {
      return res.status(500).json({
        error: "Error guardando cliente",
        detail: typeof lastErr?.data === "string" ? lastErr.data : JSON.stringify(lastErr?.data),
        status: lastErr?.status,
        checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`,
        hash: hashPedido,
      });
    }
  }

  // ── 5. Guardar turnos ────────────────────────────────────────────────────
  const precioPorSlot = Math.round(montoInt / slots.length);
  const turnosBody = slots.map(h => ({
    fecha, hora: h, tipo: "ocasional", estado: "pendiente_pago",
    cliente_id: clienteId, precio: precioPorSlot, sena: 0, saldo: precioPorSlot,
    notas: `Pago online vía Pagopar - Pedido ${pedidoNum}`,
    metodo_pago: "pagopar",
    pagopar_hash: hashPedido, pagopar_pedido_num: pedidoNum, pagopar_id_pedido: idPedido,
  }));

  const insTur = await sb("turnos", {
    method: "POST", body: JSON.stringify(turnosBody), prefer: "return=representation",
  });
  if (!insTur.ok) {
    console.error("[supabase] insert turnos falló:", insTur.status, JSON.stringify(insTur.data));
    return res.status(500).json({
      error: "Error guardando turnos",
      detail: typeof insTur.data === "string" ? insTur.data : JSON.stringify(insTur.data),
      status: insTur.status,
      checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`,
      hash: hashPedido,
    });
  }

  return res.status(200).json({
    ok: true,
    checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`,
    hash: hashPedido,
    pedido: pedidoNum,
  });
}
