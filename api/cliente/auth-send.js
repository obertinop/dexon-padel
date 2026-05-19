// /api/cliente/auth-send.js
// Envía un código de verificación de 6 dígitos por WhatsApp al cliente.
// Template usado: "dexon_codigo" — debe estar aprobado en Meta con 1 parámetro {{1}} = código.
//
// Body: { telefono: "0994821477" | "+595994821477" }
// Response: { ok: true, isNewClient: bool, expira_en: ISOString }
//
// Si el teléfono no existe en `clientes`, igual mandamos el código —
// la creación del cliente sucede al verificar (si trae nombre/apellido).

import { createClient } from "@supabase/supabase-js";

const RATE_LIMIT_SECONDS = 60;   // No reenviar dentro de 60s
const OTP_EXPIRA_MIN     = 5;    // Código válido por 5 minutos

function normalizarTel(raw) {
  let t = (raw || "").replace(/\D/g, "");
  if (!t) return null;
  if (t.startsWith("0")) t = "595" + t.slice(1);
  if (!t.startsWith("595")) t = "595" + t;
  if (t.length < 11) return null;
  return t;
}

function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { telefono } = req.body || {};
  const tel = normalizarTel(telefono);
  if (!tel) return res.status(400).json({ error: "Teléfono inválido" });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Rate limit — buscamos OTP creado en últimos 60s
  const { data: reciente } = await sb
    .from("otp_codes")
    .select("creado_en")
    .eq("telefono", tel)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reciente) {
    const ageSec = (Date.now() - new Date(reciente.creado_en).getTime()) / 1000;
    if (ageSec < RATE_LIMIT_SECONDS) {
      return res.status(429).json({ error: `Esperá ${Math.ceil(RATE_LIMIT_SECONDS - ageSec)}s para reenviar` });
    }
  }

  // ¿Es cliente existente?
  const { data: cli } = await sb
    .from("clientes")
    .select("id, nombre")
    .eq("telefono", tel)
    .maybeSingle();

  const isNewClient = !cli;
  const codigo = generarCodigo();
  const expira = new Date(Date.now() + OTP_EXPIRA_MIN * 60 * 1000);

  // Guardar OTP
  const { error: insErr } = await sb.from("otp_codes").insert({
    telefono: tel,
    codigo,
    expira_en: expira.toISOString(),
    ip: req.headers["x-forwarded-for"] || null,
  });
  if (insErr) {
    console.error("[auth-send] DB error:", insErr);
    return res.status(500).json({ error: "No se pudo generar el código" });
  }

  // Enviar por WhatsApp — template "dexon_codigo"
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_TOKEN;
  if (!PHONE_ID || !TOKEN) {
    return res.status(500).json({ error: "WhatsApp no configurado en el servidor" });
  }

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: tel,
        type: "template",
        template: {
          name: "dexon_codigo",
          language: { code: "es" },
          components: [{
            type: "body",
            parameters: [{ type: "text", text: codigo }],
          }],
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("[auth-send] WA error:", JSON.stringify(data));
      return res.status(500).json({ error: "No se pudo enviar el código por WhatsApp" });
    }
    console.log("[auth-send] OTP enviado a", tel, "id:", data?.messages?.[0]?.id);
  } catch (e) {
    console.error("[auth-send] Red error:", e);
    return res.status(500).json({ error: "Error de red enviando WhatsApp" });
  }

  return res.status(200).json({
    ok: true,
    isNewClient,
    expira_en: expira.toISOString(),
  });
}
