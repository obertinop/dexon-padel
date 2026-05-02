// /api/pagopar/crear-pago.js
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { nombre, telefono, email, documento, fecha, slots, total } = req.body || {};

  if (!nombre || !telefono || !fecha || !Array.isArray(slots) || slots.length === 0 || !total) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const PUBLIC_KEY  = process.env.PAGOPAR_PUBLIC_KEY;
  const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
  const API_URL     = process.env.PAGOPAR_API_URL || "https://api.pagopar.com";

  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return res.status(500).json({ error: "Variables PAGOPAR_PUBLIC_KEY / PAGOPAR_PRIVATE_KEY no configuradas en Vercel" });
  }

  // ID alfanumérico puro (sin guiones) tal como exige Pagopar
  const idPedido = `RES${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const montoInt = parseInt(total, 10);

  // Fórmula oficial: sha1(privateKey + idPedido + strval(floatval(monto)))
  const token = sha1(PRIVATE_KEY + idPedido + String(parseFloat(montoInt)));

  console.log("[pagopar] idPedido:", idPedido, "| monto:", montoInt, "| token:", token);

  const fechaMax = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString().replace("T", " ").slice(0, 19);

  const horasStr  = slots.map(h => `${h}:00`).join(", ");
  const descripcion = `Reserva DEXON Padel - ${fecha} - ${horasStr}`;

  let telNorm = telefono.replace(/\s+/g, "");
  if (!telNorm.startsWith("+")) {
    telNorm = telNorm.startsWith("0") ? `+595${telNorm.slice(1)}` : `+595${telNorm}`;
  }

  const payload = {
    token,
    public_key:           PUBLIC_KEY,
    monto_total:          montoInt,
    tipo_pedido:          "VENTA-COMERCIO",
    id_pedido_comercio:   idPedido,
    descripcion_resumen:  descripcion,
    fecha_maxima_pago:    fechaMax,
    comprador: {
      ruc:                 "",
      email:               email || "sinmail@dexonpadel.com.py",
      ciudad:              null,
      nombre,
      telefono:            telNorm,
      direccion:           "",
      documento:           documento || "0",
      coordenadas:         "",
      razon_social:        nombre,
      tipo_documento:      "CI",
      direccion_referencia: null,
    },
    compras_items: [{
      ciudad:                         "1",
      categoria:                      "909",
      nombre:                         descripcion,
      cantidad:                       slots.length,
      public_key:                     PUBLIC_KEY,
      url_imagen:                     "",
      descripcion,
      id_producto:                    idPedido,
      precio_total:                   montoInt,
      vendedor_telefono:              "",
      vendedor_direccion:             "",
      vendedor_direccion_referencia:  "",
      vendedor_direccion_coordenadas: "",
    }],
  };

  let pagoparData;
  try {
    const r = await fetch(`${API_URL}/api/comercios/2.0/iniciar-transaccion`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    pagoparData = await r.json();
  } catch (e) {
    console.error("[pagopar] Error de red:", e);
    return res.status(502).json({ error: "No se pudo contactar a Pagopar" });
  }

  console.log("[pagopar] Respuesta:", JSON.stringify(pagoparData));

  if (!pagoparData?.respuesta) {
    const msg = typeof pagoparData?.resultado === "string"
      ? pagoparData.resultado
      : pagoparData?.resultado?.[0]?.mensaje || pagoparData?.mensaje || "Pagopar rechazó el pedido";
    return res.status(400).json({ error: msg, raw: pagoparData });
  }

  const hashPedido = pagoparData.resultado[0].data;
  const pedidoNum  = pagoparData.resultado[0].pedido;

  // ── Guardar en Supabase ──────────────────────────────────────────────────
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const telLimpio = telefono.replace(/\D/g, "");
  const { data: clientesEnc } = await sb
    .from("clientes")
    .select("id")
    .or(`telefono.eq.${telefono},telefono.eq.${telLimpio}`)
    .limit(1);

  let clienteId;
  if (clientesEnc?.length > 0) {
    clienteId = clientesEnc[0].id;
  } else {
    const { data: nuevoCli, error: errCli } = await sb
      .from("clientes")
      .insert({ nombre: nombre.trim(), telefono: telefono.trim(), nivel: "intermedio", notas: "Registrado vía Pagopar" })
      .select("id").single();
    if (errCli) return res.status(500).json({ error: "Error guardando cliente" });
    clienteId = nuevoCli.id;
  }

  const precioPorSlot = Math.round(montoInt / slots.length);
  const { error: errTur } = await sb.from("turnos").insert(
    slots.map(h => ({
      fecha, hora: h, tipo: "ocasional", estado: "pendiente_pago",
      cliente_id: clienteId, precio: precioPorSlot, sena: 0, saldo: precioPorSlot,
      notas: `Pago online vía Pagopar - Pedido ${pedidoNum}`,
      metodo_pago: "pagopar",
      pagopar_hash: hashPedido, pagopar_pedido_num: pedidoNum, pagopar_id_pedido: idPedido,
    }))
  );
  if (errTur) return res.status(500).json({ error: "Error guardando turnos" });

  return res.status(200).json({
    ok: true,
    checkout_url: `https://www.pagopar.com/pagos/${hashPedido}`,
    hash: hashPedido,
    pedido: pedidoNum,
  });
}
