import { Hono } from 'hono';
import { signJWT } from '../lib/auth.js';
import { adminAuth } from '../middleware/admin.js';

const app = new Hono();

app.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) return c.json({ error: 'Email y contraseña requeridos' }, 400);

  if (email !== c.env.ADMIN_EMAIL || password !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Credenciales incorrectas' }, 401);
  }

  const exp = Math.floor(Date.now() / 1000) + 86400; // 24 horas
  const token = await signJWT({ sub: email, exp }, c.env.JWT_SECRET);
  return c.json({ token, email, expires_in: 86400 });
});

app.post('/logout', adminAuth, async (c) => {
  return c.json({ ok: true });
});

export default app;
