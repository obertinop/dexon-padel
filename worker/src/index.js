import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import tableRoutes from './routes/table.js';
import reservarRoutes from './routes/reservar.js';
import pagoparRoutes from './routes/pagopar.js';
import whatsappRoutes from './routes/whatsapp.js';
import clienteRoutes from './routes/cliente.js';
import { runRecordatorios } from './routes/cron.js';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-secret'],
}));

app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.route('/api/auth',      authRoutes);
app.route('/api/v1',        tableRoutes);
app.route('/api/reservar',  reservarRoutes);
app.route('/api/pagopar',   pagoparRoutes);
app.route('/api/whatsapp',  whatsappRoutes);
app.route('/api/cliente',   clienteRoutes);

app.notFound((c) => c.json({ error: 'No encontrado' }, 404));

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runRecordatorios(env));
  },
};
