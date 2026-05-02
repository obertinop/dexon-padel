// /api/whatsapp/webhook.js
// Recibe mensajes entrantes de WhatsApp vía Meta Cloud API.
// GET  → verificación del webhook (Meta lo llama una sola vez al configurar)
// POST → mensajes entrantes de clientes
//
// SQL necesario en Supabase (ejecutar una sola vez):
//   create table if not exists whatsapp_mensajes (
//     id         bigserial primary key,
//     de         text not null,
//     nombre     text,
//     mensaje    text,
//     tipo       text default 'texto',
//     meta_id    text unique,
//     leido      boolean default false,
//     created_at timestamptz default now()
//   );
//   alter table whatsapp_mensajes enable row level security;
//   create policy "service role full access" on whatsapp_mensajes
//     using (true) with check (true);

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // ── GET: Meta verifica el webhook ────────────────────────────────────────
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("[whatsapp-wh] Webhook verificado OK");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Token de verificación incorrecto" });
  }

  // ── POST: llega un mensaje ────────────────────────────────────────────────
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body;

  // Meta también manda status updates (delivered, read) — los ignoramos
  const entry   = body?.entry?.[0];
  const change  = entry?.changes?.[0];
  const value   = change?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return res.status(200).json({ ok: true }); // ack sin procesar
  }

  // Solo procesamos mensajes de texto (pueden llegar imágenes, audio, etc.)
  const tipo    = message.type || "desconocido";
  const de      = message.from;                               // número E.164 sin +
  const metaId  = message.id;
  const nombre  = value?.contacts?.[0]?.profile?.name || de;
  const texto   = tipo === "text"
    ? message.text?.body
    : `[${tipo}]`;                                            // imagen, audio, etc.

  console.log(`[whatsapp-wh] Mensaje de ${nombre} (${de}): ${texto}`);

  // Guardar en Supabase (la tabla se crea con el SQL del comentario de arriba)
  try {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await sb.from("whatsapp_mensajes").upsert(
      { de, nombre, mensaje: texto, tipo, meta_id: metaId, leido: false },
      { onConflict: "meta_id", ignoreDuplicates: true }
    );

    if (error) {
      console.error("[whatsapp-wh] Error guardando en Supabase:", error);
    }
  } catch (e) {
    console.error("[whatsapp-wh] Error inesperado:", e);
  }

  // Meta espera siempre un 200 rápido
  return res.status(200).json({ ok: true });
}
