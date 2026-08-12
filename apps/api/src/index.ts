import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { checkDatabaseConnection, prisma } from './db/prisma.js';

async function main() {
  const env = loadEnv();
  const app = createApp();

  try {
    await checkDatabaseConnection();
    console.log('[api] database connection ok');
  } catch (error) {
    console.error('[api] database connection failed:', error);
    process.exit(1);
  }

  serve(
    {
      fetch: app.fetch,
      hostname: env.API_HOST,
      port: env.API_PORT,
    },
    (info) => {
      console.log(`[api] listening on http://${info.address}:${info.port}`);
    },
  );

  const shutdown = async (signal: string) => {
    console.log(`[api] received ${signal}, shutting down`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (error) => {
  console.error('[api] failed to start:', error);
  await prisma.$disconnect();
  process.exit(1);
});
