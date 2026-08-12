import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

export type AuthVariables = {
  userId: string;
  accessToken: string;
};

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized('Token autentikasi diperlukan.');
  }

  const accessToken = header.slice('Bearer '.length).trim();
  if (!accessToken) {
    throw unauthorized('Token autentikasi diperlukan.');
  }

  const env = loadEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw unauthorized('Sesi tidak valid atau sudah berakhir.');
  }

  c.set('userId', data.user.id);
  c.set('accessToken', accessToken);
  await next();
});
