import { Hono } from 'hono';
import { checkDatabaseConnection } from '../db/prisma.js';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) => {
  return c.json({ status: 'ok' });
});

healthRoutes.get('/db', async (c) => {
  await checkDatabaseConnection();
  return c.json({ status: 'ok', database: 'connected' });
});
