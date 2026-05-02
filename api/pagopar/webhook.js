// /api/pagopar/webhook.js
// Pagopar nos avisa acá cuando un pago se confirma o reversa
// CRÍTICO: validamos el token sino cualquiera podría marcar pagos como confirmados
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const json = req.body;
  if (!json?.resultado?.[0]) {
    console.error("Webhook recibió payload inválido:", JSON.stringify(json));
    return res.status(400).json({ error: "Payload inválido" });
  }

  const data = json.resultado[0];
  const { hash_pedido, token, pagado } = data;

  // VALIDACIÓN DE TOKEN — sin esto cualquiera podría marcar pagos
  const tokenEsperado = sha1(process.env.PAGOPAR_PRIVATE_KEY + hash_pedido);
  if (tokenEsperado !== token) {
    console.error("Token Pagopar inválido para hash:", hash_pedido);
    return res.status(401).json({ error: "Token no coincide" });
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Buscar todos los turnos de este pedido + datos del cliente para descripción
  const { data: turnos, error: errBuscar } = await sb
    .from("turnos")
    .select("id, precio, hora, fecha, cliente_id, tipo, clientes(nombre)")
    .eq("pagopar_hash", hash_pedido);

  if (errBuscar) {
    console.error("Error buscando turnos:", errBuscar);
    return res.status(500).json({ error: "Error interno" });
  }

  if (!turnos || turnos.length === 0) {
    console.warn("Turnos no encontrados para hash:", hash_pedido);
    return res.status(200).json(json.resultado);
  }

  const idsTurnos = turnos.map(t => t.id);

  if (pagado === true) {
    // PAGO CONFIRMADO → reserva oficial
    const { error: errUpd } = await sb
      .from("turnos")
      .update({
        estado: "reservado",
        pagopar_forma_pago: data.forma_pago || "Pago online",
        pagopar_fecha_pago: data.fecha_pago,
        sena: turnos[0].precio,
        saldo: 0,
        notas: `Pago online confirmado (${data.forma_pago}) - Comprob. ${data.numero_comprobante_interno}`,
      })
      .in("id", idsTurnos);

    if (errUpd) {
      console.error("Error actualizando turnos como pagados:", errUpd);
      return res.status(500).json({ error: "Error actualizando turnos" });
    }

    // Registrar el ingreso en caja (idempotente: una fila por turno, evita duplicados en reintentos)
    const { data: yaRegistrados } = await sb
      .from("caja")
      .select("turno_id")
      .in("turno_id", idsTurnos)
      .eq("tipo", "ingreso");

    const idsYa = new Set((yaRegistrados || []).map(r => r.turno_id));
    const nuevosMov = turnos
      .filter(t => !idsYa.has(t.id))
      .map(t => ({
        descripcion: `Pago online (${data.forma_pago || "Pagopar"}) - ${t.clientes?.nombre || "?"}`,
        tipo: "ingreso",
        categoria: t.tipo === "clase" ? "clase" : "reserva",
        monto: t.precio,
        fecha: t.fecha,
        turno_id: t.id,
      }));

    if (nuevosMov.length > 0) {
      const { error: errCaja } = await sb.from("caja").insert(nuevosMov);
      if (errCaja) {
        console.error("Error registrando movimientos en caja:", errCaja);
        // no bloqueamos la respuesta — el turno ya está reservado
      } else {
        console.log(`✓ Caja: ${nuevosMov.length} mov(s) registrado(s)`);
      }
    }

    console.log(`✓ Pago confirmado hash=${hash_pedido} turnos=${idsTurnos.length}`);

  } else if (pagado === false && data.fecha_pago === null && data.cancelado === false) {
    console.log(`Pedido todavía pendiente: ${hash_pedido}`);

  } else {
    // REVERSIÓN o cancelación → cancelar turnos y revertir ingreso si existía
    const { error: errRev } = await sb
      .from("turnos")
      .update({
        estado: "cancelado",
        notas: `Pago reversado/cancelado en Pagopar (${data.forma_pago})`,
      })
      .in("id", idsTurnos);

    if (errRev) {
      console.error("Error reversando turnos:", errRev);
    }

    // Registrar egreso por la reversión (solo si había ingreso previo)
    const { data: ingresosPrevios } = await sb
      .from("caja")
      .select("id, turno_id, monto")
      .in("turno_id", idsTurnos)
      .eq("tipo", "ingreso");

    if (ingresosPrevios?.length > 0) {
      const movRev = ingresosPrevios.map(m => ({
        descripcion: `Reversión Pagopar - turno ${m.turno_id}`,
        tipo: "egreso",
        categoria: "reserva",
        monto: m.monto,
        fecha: new Date().toISOString().slice(0, 10),
        turno_id: m.turno_id,
      }));
      await sb.from("caja").insert(movRev);
    }

    console.log(`× Pago reversado hash=${hash_pedido}`);
  }

  return res.status(200).json(json.resultado);
}
