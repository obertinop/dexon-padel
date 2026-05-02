// /api/whatsapp/webhook.js
// Recibe mensajes entrantes de WhatsApp vía Meta Cloud API.
// GET  → verificación del webhook
// POST → mensajes entrantes (texto, audio, imagen, documento, etc.)
//
// SQL — agregar columna media_id a la tabla existente:
//   alter table whatsapp_mensajes add column if not exists media_id text;

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Token de verificación incorrecto" });
  }

  if (req.method !== "POST") return res.status(405).end();

  const body    = req.body;
  const entry   = body?.entry?.[0];
  const change  = entry?.changes?.[0];
  const value   = change?.value;
  const message = value?.messages?.[0];

  if (!message) return res.status(200).json({ ok: true });

  const tipo   = message.type || "desconocido";
  const de     = message.from;
  const metaId = message.id;
  const nombre = value?.contacts?.[0]?.profile?.name || de;

  // Extraer texto y media_id según el tipo de mensaje
  let texto   = null;
  let mediaId = null;

  switch (tipo) {
    case "text":
      texto = message.text?.body;
      break;
    case "audio":
      mediaId = message.audio?.id;
      texto   = message.audio?.voice ? "[Nota de voz]" : "[Audio]";
      break;
    case "image":
      mediaId = message.image?.id;
      texto   = message.image?.caption || "[Imagen]";
      break;
    case "video":
      mediaId = message.video?.id;
      texto   = message.video?.caption || "[Video]";
      break;
    case "document":
      mediaId = message.document?.id;
      texto   = message.document?.filename || "[Documento]";
      break;
    case "sticker":
      mediaId = message.sticker?.id;
      texto   = "[Sticker]";
      break;
    default:
      texto = `[${tipo}]`;
  }

  console.log(`[whatsapp-wh] ${tipo} de ${nombre} (${de}) media=${mediaId||"-"}`);

  try {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { error } = await sb.from("whatsapp_mensajes").upsert(
      { de, nombre, mensaje: texto, tipo, meta_id: metaId, media_id: mediaId, leido: false },
      { onConflict: "meta_id", ignoreDuplicates: true }
    );
    if (error) console.error("[whatsapp-wh] Supabase error:", error);
  } catch (e) {
    console.error("[whatsapp-wh] Error inesperado:", e);
  }

  return res.status(200).json({ ok: true });
}
