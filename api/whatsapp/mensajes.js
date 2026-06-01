// /api/whatsapp/mensajes.js
// GET  ?limit=500            → lista los mensajes más recientes (orden cronológico)
// POST { ids:[...] }         → marca como leídos (+ tildes azules en Meta)
// DELETE { de:"telefono" }   → elimina toda la conversación
import { sbAdmin, checkSecret, markRead, waConfigured } from "../../lib/whatsapp.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!checkSecret(req)) return res.status(401).json({ error: "No autorizado" });

  const sb = sbAdmin();

  if (req.method === "GET") {
    const limit = parseInt(req.query.limit || "500", 10);
    const soloNoLeidos = req.query.solo_no_leidos === "true";

    // Traer los más RECIENTES (desc) y devolver en orden cronológico (asc).
    let q = sb.from("whatsapp_mensajes").select("*").order("created_at", { ascending: false }).limit(limit);
    if (soloNoLeidos) q = q.eq("leido", false);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json((data || []).reverse());
  }

  if (req.method === "POST") {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids requerido" });

    const { error } = await sb.from("whatsapp_mensajes").update({ leido: true }).in("id", ids);
    if (error) return res.status(500).json({ error: error.message });

    // Tildes azules para el cliente: marcar leído en Meta el último entrante.
    if (waConfigured()) {
      try {
        const { data } = await sb
          .from("whatsapp_mensajes").select("meta_id")
          .in("id", ids).eq("direccion", "entrante")
          .order("created_at", { ascending: false }).limit(1);
        if (data?.[0]?.meta_id) await markRead(data[0].meta_id);
      } catch (e) { console.error("[mensajes] markRead:", e.message); }
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { de } = req.body || {};
    if (!de) return res.status(400).json({ error: "de requerido" });
    const { error } = await sb.from("whatsapp_mensajes").delete().eq("de", de);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
