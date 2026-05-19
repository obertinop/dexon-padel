// /api/cliente/turno-accion.js
// Endpoint unificado para acciones sobre un turno propio:
//   - reagendar — cambiar a otro slot (>= 12h antes)
//   - cancelar  — cancelar (>= 12h antes)
//   - pagar     — disparar nuevo flujo Pagopar
//
// Header: Authorization: Bearer <token>
// Body: { accion: "reagendar"|"cancelar"|"pagar", turno_id, nuevo_inicio?, nueva_duracion? }

import { autenticarCliente } from "./me.js";

const HORAS_LIMITE = 12;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { cliente, sb, error } = await autenticarCliente(req);
  if (error) return res.status(401).json({ error });

  const { accion, turno_id, nuevo_inicio, nueva_duracion } = req.body || {};
  if (!accion || !turno_id) return res.status(400).json({ error: "Faltan datos" });

  // Validar que el turno sea de este cliente
  const { data: turno } = await sb
    .from("turnos")
    .select("*")
    .eq("id", turno_id)
    .eq("cliente_id", cliente.id)
    .maybeSingle();
  if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

  if (accion === "cancelar" || accion === "reagendar") {
    // Política 12h
    const horasFalta = (new Date(turno.inicio).getTime() - Date.now()) / 3600000;
    if (horasFalta < HORAS_LIMITE) {
      return res.status(403).json({ error: `Solo podés ${accion} hasta ${HORAS_LIMITE}h antes del turno. Escribinos por WhatsApp.` });
    }
    if (turno.tipo === "abono") {
      return res.status(403).json({ error: "Los turnos de abono se gestionan con el administrador" });
    }
  }

  if (accion === "cancelar") {
    await sb.from("turnos").update({ estado: "cancelado", cancelado_en: new Date().toISOString() }).eq("id", turno.id);
    // TODO: si tenía pago, disparar reembolso o acreditar saldo_favor
    return res.status(200).json({ ok: true });
  }

  if (accion === "reagendar") {
    if (!nuevo_inicio) return res.status(400).json({ error: "Falta nuevo_inicio" });

    // Verificar que el slot esté libre
    const dur = nueva_duracion || turno.duracion || 60;
    const finNuevo = new Date(new Date(nuevo_inicio).getTime() + dur * 60000).toISOString();
    const { data: choque } = await sb
      .from("turnos")
      .select("id")
      .neq("id", turno.id)
      .neq("estado", "cancelado")
      .lt("inicio", finNuevo)
      .gt("fin", nuevo_inicio)
      .limit(1);
    if (choque?.length) return res.status(409).json({ error: "Ese horario ya está ocupado" });

    await sb.from("turnos").update({
      inicio: nuevo_inicio,
      fin: finNuevo,
      reagendado_en: new Date().toISOString(),
      inicio_original: turno.inicio_original || turno.inicio,
    }).eq("id", turno.id);

    return res.status(200).json({ ok: true });
  }

  if (accion === "pagar") {
    // Delegar al endpoint existente /api/pagopar/crear-pago.js
    return res.status(501).json({ error: "Implementar redirección a /api/pagopar/crear-pago con turno_id existente" });
  }

  return res.status(400).json({ error: "Acción no soportada" });
}
