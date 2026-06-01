// lib/whatsapp.js
// Helpers compartidos para la integración con WhatsApp Cloud API (Meta).
// Importado por las funciones serverless de /api/whatsapp/* y /api/cron/*.
// Vive fuera de /api para que Vercel NO lo trate como un endpoint.
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ── Config ───────────────────────────────────────────────────────────────
// Versión de la Graph API centralizada (overrideable por env). v19 quedó vieja.
export const WA_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
export const PHONE_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID;
export const TOKEN      = process.env.WHATSAPP_TOKEN;

// Teléfono personal del ADMIN (recibe los avisos internos). NO es el de la empresa:
// el número de la empresa es el emisor y no puede mandarse mensajes a sí mismo.
export const ADMIN_TEL  = process.env.WHATSAPP_ADMIN_NOTIFY || "595981086046";

export const graphUrl = (path) => `https://graph.facebook.com/${WA_VERSION}/${path}`;

export const waConfigured = () => !!(PHONE_ID && TOKEN);

// ── Supabase service client ────────────────────────────────────────────────
export const sbAdmin = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Auth para endpoints internos ───────────────────────────────────────────
// Mismo patrón que /api/whatsapp/enviar.js: si API_SECRET está seteado, se exige
// el header x-api-secret. Si no está seteado, no rompe (comportamiento previo).
export const checkSecret = (req) => {
  const secret = process.env.API_SECRET;
  if (!secret) return true;
  return req.headers["x-api-secret"] === secret;
};

// ── Verificación de firma del webhook (X-Hub-Signature-256) ────────────────
// HMAC-SHA256 del body crudo con el App Secret de Meta. Timing-safe.
export const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return { ok: true, skipped: true }; // sin secret configurado → no se valida
  if (!signatureHeader || !rawBody) return { ok: false, skipped: false };
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return { ok: false, skipped: false };
    return { ok: crypto.timingSafeEqual(a, b), skipped: false };
  } catch {
    return { ok: false, skipped: false };
  }
};

// ── Normalización de teléfono (Paraguay) ───────────────────────────────────
export const normalizeTel = (telefono) => {
  let tel = String(telefono || "").replace(/\D/g, "");
  if (tel.startsWith("0")) tel = "595" + tel.slice(1);
  if (!tel.startsWith("595")) tel = "595" + tel;
  return tel;
};

// ── Envíos a Meta ──────────────────────────────────────────────────────────
async function postMessage(payload) {
  const r = await fetch(graphUrl(`${PHONE_ID}/messages`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("[wa] Meta API error:", JSON.stringify(data));
    return { ok: false, status: r.status, error: data?.error?.message, code: data?.error?.code };
  }
  return { ok: true, message_id: data?.messages?.[0]?.id };
}

export const sendText = (to, body, contextMessageId) =>
  postMessage({
    to,
    type: "text",
    text: { body, preview_url: true },
    ...(contextMessageId ? { context: { message_id: contextMessageId } } : {}),
  });

export const sendMedia = (to, kind, mediaId, caption, contextMessageId) =>
  postMessage({
    to,
    type: kind, // image | document | audio | video | sticker
    [kind]: { id: mediaId, ...(caption && kind !== "audio" && kind !== "sticker" ? { caption } : {}) },
    ...(contextMessageId ? { context: { message_id: contextMessageId } } : {}),
  });

export const sendTemplate = (to, template) =>
  postMessage({ to, type: "template", template });

export const sendReaction = (to, messageId, emoji) =>
  postMessage({ to, type: "reaction", reaction: { message_id: messageId, emoji: emoji || "" } });

// Marca un mensaje entrante como leído (tildes azules para el cliente).
// typing=true muestra además el indicador "escribiendo…" (se cae solo a los 25s).
export const markRead = async (messageId, typing = false) => {
  if (!messageId) return { ok: false };
  const r = await fetch(graphUrl(`${PHONE_ID}/messages`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
      ...(typing ? { typing_indicator: { type: "text" } } : {}),
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    console.error("[wa] markRead error:", JSON.stringify(e));
    return { ok: false };
  }
  return { ok: true };
};
