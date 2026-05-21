// api/ping.js — archivo de prueba para verificar el límite de funciones de Vercel
export default function handler(req, res) {
  res.status(200).json({ ok: true, ts: Date.now() });
}
