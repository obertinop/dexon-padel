// /api/whatsapp/mensajes.js
// Devuelve mensajes entrantes de WhatsApp y permite marcarlos como leídos.
// GET  ?limit=50&solo_no_leidos=true  → lista mensajes
// POST { ids: [1,2,3] }              → marcar como leídos
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === "GET") {
    const limit = parseInt(req.query.limit || "100", 10);
    const soloNoLeidos = req.query.solo_no_leidos === "true";

    let q = sb
      .from("whatsapp_mensajes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (soloNoLeidos) q = q.eq("leido", false);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === "POST") {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids requerido" });
    }
    const { error } = await sb
      .from("whatsapp_mensajes")
      .update({ leido: true })
      .in("id", ids);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
