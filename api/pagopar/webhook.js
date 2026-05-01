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

  // Buscar todos los turnos de este pedido (puede haber más de uno por hash)
  const { data: turnos, error: errBuscar } = await sb
    .from("turnos")
    .select("id, precio, hora, fecha")
    .eq("pagopar_hash", hash_pedido);

  if (errBuscar) {
    console.error("Error buscando turnos:", errBuscar);
    return res.status(500).json({ error: "Error interno" });
  }

  if (!turnos || turnos.length === 0) {
    console.warn("Turnos no encontrados para hash:", hash_pedido);
    // Devolvemos 200 para que Pagopar no reintente eternamente
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
    console.log(`✓ Pago confirmado hash=${hash_pedido} turnos=${idsTurnos.length}`);

  } else if (pagado === false && data.fecha_pago === null && data.cancelado === false) {
    // Pedido aún pendiente de pago — no hacer nada (sigue como pendiente_pago)
    console.log(`Pedido todavía pendiente: ${hash_pedido}`);

  } else {
    // REVERSIÓN o cancelación
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
    console.log(`× Pago reversado hash=${hash_pedido}`);
  }

  // Pagopar espera que devolvamos el contenido de "resultado" tal cual
  return res.status(200).json(json.resultado);
}
