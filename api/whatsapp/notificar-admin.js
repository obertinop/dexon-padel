// Envía un texto libre al teléfono de admin configurado en config (igual que webhook.js).
// POST { texto: "..." }
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { texto } = req.body || {};
  if (!texto) return res.status(400).json({ error: "texto requerido" });

  const TOKEN  = process.env.WHATSAPP_TOKEN;
  const PH_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!TOKEN || !PH_ID) return res.status(500).json({ error: "Variables WA no configuradas" });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: cfgRows } = await sb.from("config").select("wa_admin_tel").limit(1);
  const adminTel = cfgRows?.[0]?.wa_admin_tel || process.env.WHATSAPP_ADMIN_NOTIFY || "595981086046";

  const r = await fetch(`https://graph.facebook.com/v19.0/${PH_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: adminTel,
      type: "text",
      text: { body: texto },
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    console.error("[notificar-admin] Error:", JSON.stringify(data));
    return res.status(r.status).json({ error: data?.error?.message });
  }
  return res.status(200).json({ ok: true });
}
