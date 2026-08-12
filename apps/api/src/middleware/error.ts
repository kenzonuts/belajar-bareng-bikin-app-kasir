import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export async function errorHandler(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status,
    );
  }

  console.error('[api] unhandled error:', err);

  return c.json(
    {
      error: 'Internal Server Error',
      status: 500,
    },
    500,
  );
}

export async function requestLogger(c: Context, next: Next) {
  const startedAt = Date.now();
  await next();
  const durationMs = Date.now() - startedAt;
  console.log(`[api] ${c.req.method} ${c.req.path} -> ${c.res.status} (${durationMs}ms)`);
}
