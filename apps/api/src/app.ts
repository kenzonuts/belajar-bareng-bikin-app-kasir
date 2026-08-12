import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, requestLogger } from './middleware/error.js';
import { authRoutes } from './routes/auth.js';
import { categoriesRoutes } from './routes/categories.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { healthRoutes } from './routes/health.js';
import { stockRoutes } from './routes/stock.js';
import { transactionsRoutes } from './routes/transactions.js';

export function createApp() {
  const app = new Hono();

  app.use('*', requestLogger);
  app.use(
    '*',
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      allowHeaders: ['Authorization', 'Content-Type'],
    }),
  );

  app.route('/health', healthRoutes);
  app.route('/auth', authRoutes);
  app.route('/categories', categoriesRoutes);
  app.route('/stock', stockRoutes);
  app.route('/transactions', transactionsRoutes);
  app.route('/dashboard', dashboardRoutes);

  app.notFound((c) => c.json({ error: 'Not Found', status: 404 }, 404));
  app.onError(errorHandler);

  return app;
}
