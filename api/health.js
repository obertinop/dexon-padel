/**
 * Health check endpoint para Meta/Facebook scraper
 * Responde sin bloqueos a cualquier User-Agent
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'] || 'unknown'
  });
}
