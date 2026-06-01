// /api/whatsapp/webhook.js
// Recibe eventos de WhatsApp vía Meta Cloud API.
// GET  → verificación del webhook
// POST → mensajes entrantes + estados de entrega + reacciones
//        + bienvenida automática + notificación al admin
//
// Seguridad: valida X-Hub-Signature-256 (HMAC-SHA256 con WHATSAPP_APP_SECRET).
// Si WHATSAPP_APP_SECRET no está seteado, no se valida (no rompe).
//
// SQL (ya aplicado): ver migración whatsapp_inbox_upgrade.

import {
  sbAdmin, waConfigured, PHONE_ID, TOKEN, ADMIN_TEL,
  sendText, verifyWebhookSignature,
} from "../../lib/whatsapp.js";

// Necesitamos el body CRUDO para validar la firma → desactivamos el parser de Vercel.
export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve) => {
    // Si el stream ya fue consumido por la plataforma, no esperamos (evita colgarse).
    if (req.readableEnded || req.complete) return resolve("");
    let data = "";
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on("data", (c) => (data += c));
    req.on("end", () => finish(data));
    req.on("error", () => finish(""));
    setTimeout(() => finish(data), 2000); // red de seguridad: nunca colgar
  });
}

const ESTADO_MAP = { sent: "enviado", delivered: "entregado", read: "leido", failed: "fallido" };

export default async function handler(req, res) {
  // ── Verificación del webhook (GET) ──
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Token de verificación incorrecto" });
  }

  if (req.method !== "POST") return res.status(405).end();

  // ── Body crudo + validación de firma ──
  const raw = await getRawBody(req);
  let body;
  try {
    body = raw ? JSON.parse(raw) : req.body || {};
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }

  // Fail-closed sólo si hay secret configurado Y pudimos leer el body crudo.
  if (raw) {
    const sig = req.headers["x-hub-signature-256"];
    const v = verifyWebhookSignature(raw, sig);
    if (!v.skipped && !v.ok) {
      console.warn("[webhook] Firma inválida — evento rechazado");
      return res.status(401).json({ error: "Firma inválida" });
    }
  }

  const entry = body?.entry?.[0];
  const value = entry?.changes?.[0]?.value;
  if (!value) return res.status(200).json({ ok: true });

  const sb = sbAdmin();

  // ── 1. ESTADOS DE ENTREGA (sent/delivered/read/failed) ──
  if (Array.isArray(value.statuses) && value.statuses.length) {
    for (const st of value.statuses) {
      const estado = ESTADO_MAP[st.status];
      if (!estado || !st.id) continue;
      const patch = { estado };
      if (estado === "fallido") {
        const err = st.errors?.[0];
        patch.error_msg = err ? `${err.title || ""}${err.message ? " — " + err.message : ""}`.trim() : "Error de envío";
      }
      let q = sb.from("whatsapp_mensajes").update(patch).eq("meta_id", st.id);
      // No degradar un estado superior si llegan eventos fuera de orden.
      if (estado === "entregado") q = q.not("estado", "in", '("leido","fallido")');
      if (estado === "enviado") q = q.not("estado", "in", '("entregado","leido","fallido")');
      await q;
    }
    return res.status(200).json({ ok: true });
  }

  // ── 2. MENSAJES ENTRANTES ──
  const message = value.messages?.[0];
  if (!message) return res.status(200).json({ ok: true });

  const tipo = message.type || "desconocido";
  const de = message.from;
  const metaId = message.id;
  const nombre = value?.contacts?.[0]?.profile?.name || de;
  const repliedTo = message.context?.id || null;

  // 2a. Reacción → actualiza el mensaje al que reacciona (no inserta fila nueva).
  if (tipo === "reaction") {
    const target = message.reaction?.message_id;
    const emoji = message.reaction?.emoji || null;
    if (target) await sb.from("whatsapp_mensajes").update({ reaccion: emoji }).eq("meta_id", target);
    return res.status(200).json({ ok: true });
  }

  let texto = null;
  let mediaId = null;
  switch (tipo) {
    case "text": texto = message.text?.body; break;
    case "audio": mediaId = message.audio?.id; texto = message.audio?.voice ? "[Nota de voz]" : "[Audio]"; break;
    case "image": mediaId = message.image?.id; texto = message.image?.caption || "[Imagen]"; break;
    case "video": mediaId = message.video?.id; texto = message.video?.caption || "[Video]"; break;
    case "document": mediaId = message.document?.id; texto = message.document?.filename || "[Documento]"; break;
    case "sticker": mediaId = message.sticker?.id; texto = "[Sticker]"; break;
    default: texto = `[${tipo}]`;
  }

  console.log(`[webhook] ${tipo} de ${nombre} (${de})`);

  const { error: errGuardar } = await sb.from("whatsapp_mensajes").upsert(
    { de, nombre, mensaje: texto, tipo, meta_id: metaId, media_id: mediaId, replied_to: repliedTo, leido: false, direccion: "entrante", estado: "recibido" },
    { onConflict: "meta_id", ignoreDuplicates: true }
  );
  if (errGuardar) console.error("[webhook] Error guardando:", errGuardar);

  // ── 3. AUTOMATIZACIONES (bienvenida + aviso al admin) ──
  if (!waConfigured()) return res.status(200).json({ ok: true });

  const { data: cfgRows } = await sb.from("config").select("wa_bienvenida_activo,wa_bienvenida_texto,wa_admin_tel").limit(1);
  const cfg = cfgRows?.[0] || {};
  const tareas = [];

  // Bienvenida automática (sólo en el primer mensaje de este número).
  if (cfg.wa_bienvenida_activo && cfg.wa_bienvenida_texto) {
    const { count } = await sb
      .from("whatsapp_mensajes")
      .select("id", { count: "exact", head: true })
      .eq("de", de).eq("direccion", "entrante").neq("meta_id", metaId);
    if (count === 0 || count === null) {
      tareas.push(sendText(de, cfg.wa_bienvenida_texto).catch((e) => console.error("[webhook] bienvenida:", e)));
    }
  }

  // Aviso al admin (a TU número personal — el de la empresa no puede notificarse a sí mismo).
  const adminTel = cfg.wa_admin_tel || ADMIN_TEL;
  if (de !== adminTel) {
    const preview = texto && texto.length > 60 ? texto.slice(0, 60) + "…" : texto;
    tareas.push(sendText(adminTel, `📩 Mensaje de ${nombre}:\n${preview}`).catch((e) => console.error("[webhook] notif admin:", e)));
  }

  await Promise.all(tareas);
  return res.status(200).json({ ok: true });
}
