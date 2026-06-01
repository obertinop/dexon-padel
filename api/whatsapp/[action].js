// /api/whatsapp/[action].js
// Función ÚNICA que despacha los endpoints de WhatsApp por la última parte de la ruta
// (req.query.action), para no exceder el límite de funciones serverless del plan.
// Rutas (sin cambios para el cliente):
//   /api/whatsapp/mensajes   /api/whatsapp/responder  /api/whatsapp/upload
//   /api/whatsapp/templates  /api/whatsapp/enviar     /api/whatsapp/media
// El webhook queda en su propio archivo (necesita body crudo para validar la firma).
import { mensajes, responder, upload, templates, enviar, media } from "../../lib/wa-handlers.js";

// 8mb para permitir subir adjuntos (upload). El resto ignora el límite.
export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const ROUTES = { mensajes, responder, upload, templates, enviar, media };

export default async function handler(req, res) {
  const action = req.query.action;
  const fn = ROUTES[action];
  if (!fn) return res.status(404).json({ error: `Acción desconocida: ${action}` });
  return fn(req, res);
}
