// /api/whatsapp/webhook.js
// Recibe mensajes entrantes de WhatsApp vía Meta Cloud API.
// GET  → verificación del webhook
// POST → mensajes entrantes + bienvenida automática + notificación al admin
//
// SQL:
//   alter table whatsapp_mensajes add column if not exists media_id text;
//   alter table whatsapp_mensajes add column if not exists direccion text default 'entrante';
//   alter table config add column if not exists wa_bienvenida_activo boolean default false;
//   alter table config add column if not exists wa_bienvenida_texto text;
//   alter table config add column if not exists wa_admin_tel text;
//   alter table config add column if not exists wa_recordatorio_activo boolean default false;
//   alter table config add column if not exists wa_recordatorio_template text;

import { createClient } from "@supabase/supabase-js";

async function enviarWA(phoneId, token, to, texto) {
  const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto },
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error("[webhook] Error Meta API:", JSON.stringify(err));
  }
  return r;
}

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

  let texto   = null;
  let mediaId = null;

  switch (tipo) {
    case "text":    texto = message.text?.body; break;
    case "audio":   mediaId = message.audio?.id;    texto = message.audio?.voice ? "[Nota de voz]" : "[Audio]"; break;
    case "image":   mediaId = message.image?.id;    texto = message.image?.caption || "[Imagen]"; break;
    case "video":   mediaId = message.video?.id;    texto = message.video?.caption || "[Video]"; break;
    case "document":mediaId = message.document?.id; texto = message.document?.filename || "[Documento]"; break;
    case "sticker": mediaId = message.sticker?.id;  texto = "[Sticker]"; break;
    default:        texto = `[${tipo}]`;
  }

  console.log(`[webhook] ${tipo} de ${nombre} (${de})`);

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Guardar mensaje
  const { error: errGuardar } = await sb.from("whatsapp_mensajes").upsert(
    { de, nombre, mensaje: texto, tipo, meta_id: metaId, media_id: mediaId, leido: false, direccion: "entrante" },
    { onConflict: "meta_id", ignoreDuplicates: true }
  );
  if (errGuardar) console.error("[webhook] Error guardando:", errGuardar);

  // Leer config (bienvenida + admin tel)
  const { data: cfgRows } = await sb.from("config").select("wa_bienvenida_activo,wa_bienvenida_texto,wa_admin_tel").limit(1);
  const cfg = cfgRows?.[0] || {};

  const TOKEN  = process.env.WHATSAPP_TOKEN;
  const PH_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (TOKEN && PH_ID) {
    const tareas = [];

    // Bienvenida automática (solo si es el primer mensaje de este número)
    if (cfg.wa_bienvenida_activo && cfg.wa_bienvenida_texto) {
      const { count, error: errCount } = await sb
        .from("whatsapp_mensajes")
        .select("id", { count: "exact", head: true })
        .eq("de", de)
        .eq("direccion", "entrante")
        .neq("meta_id", metaId);

      if (errCount) console.error("[webhook] Error contando mensajes:", errCount);

      if (!errCount && (count === 0 || count === null)) {
        tareas.push(
          enviarWA(PH_ID, TOKEN, de, cfg.wa_bienvenida_texto)
            .then(() => console.log(`[webhook] Bienvenida enviada a ${de}`))
            .catch(e => console.error("[webhook] Error bienvenida:", e))
        );
      }
    }

    // Notificación al admin
    const adminTel = cfg.wa_admin_tel || process.env.WHATSAPP_ADMIN_NOTIFY || "595981086046";
    if (de !== adminTel) {
      const preview = texto && texto.length > 60 ? texto.slice(0, 60) + "…" : texto;
      tareas.push(
        enviarWA(PH_ID, TOKEN, adminTel, `📩 Mensaje de ${nombre}:\n${preview}`)
          .catch(e => console.error("[webhook] Error notif admin:", e))
      );
    }

    // Esperar que todos los envíos completen antes de cerrar la función
    await Promise.all(tareas);
  }

  return res.status(200).json({ ok: true });
}
