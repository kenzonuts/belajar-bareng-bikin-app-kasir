import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboard.js';

export const dashboardRoutes = new Hono<{ Variables: AuthVariables }>();

dashboardRoutes.use('*', requireAuth);

dashboardRoutes.get('/', async (c) => {
  const data = await getDashboard(c.get('userId'));
  return c.json(data);
});
