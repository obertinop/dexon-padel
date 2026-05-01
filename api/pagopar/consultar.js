// /api/pagopar/consultar.js
// Consulta el estado actual de un pedido en Pagopar
// Útil para botón "Verificar estado" en admin y para la página /reserva-resultado
import crypto from "crypto";

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const hashPedido = req.query.hash || req.body?.hash;
  if (!hashPedido) return res.status(400).json({ error: "Falta hash" });

  const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
  const PUBLIC_KEY = process.env.PAGOPAR_PUBLIC_KEY;
  const API_URL = process.env.PAGOPAR_API_URL || "https://api.pagopar.com";

  if (!PRIVATE_KEY || !PUBLIC_KEY) {
    return res.status(500).json({ error: "Pagopar no configurado en el servidor" });
  }

  // Token según docs Pagopar: sha1(privateKey + hash_pedido)
  const token = sha1(PRIVATE_KEY + hashPedido);

  try {
    const r = await fetch(`${API_URL}/api/pedidos/1.1/traer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hash_pedido: hashPedido,
        token,
        token_publico: PUBLIC_KEY,
      }),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error("Error consultando Pagopar:", e);
    return res.status(502).json({ error: "Error contactando a Pagopar" });
  }
}
