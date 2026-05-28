import { verifyJWT } from '../lib/auth.js';

export async function adminAuth(c, next) {
  const auth = c.req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return c.json({ error: 'No autorizado' }, 401);

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'Token inválido o expirado' }, 401);

  c.set('admin', payload);
  await next();
}
