import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, requestLogger } from './middleware/error.js';
import { healthRoutes } from './routes/health.js';

export function createApp() {
  const app = new Hono();

  app.use('*', requestLogger);
  app.use(
    '*',
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    }),
  );

  app.route('/health', healthRoutes);

  app.notFound((c) => c.json({ error: 'Not Found', status: 404 }, 404));
  app.onError(errorHandler);

  return app;
}
