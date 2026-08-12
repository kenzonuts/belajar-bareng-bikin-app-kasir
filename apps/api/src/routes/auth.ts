import { Hono } from 'hono';
import { getSupabaseAdmin } from '../db/supabase.js';
import { badRequest, conflict } from '../lib/errors.js';

export const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string }>();

  const name = body.name?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!name) {
    throw badRequest('Nama wajib diisi.');
  }

  if (!email || !email.includes('@')) {
    throw badRequest('Email tidak valid.');
  }

  if (password.length < 6) {
    throw badRequest('Password minimal 6 karakter.');
  }

  const admin = getSupabaseAdmin();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (created.error) {
    const message = created.error.message.toLowerCase();
    if (
      message.includes('already been registered') ||
      message.includes('already registered') ||
      message.includes('user already exists') ||
      message.includes('duplicate')
    ) {
      throw conflict('Email sudah terdaftar. Silakan masuk.');
    }

    throw badRequest(created.error.message || 'Gagal membuat akun.');
  }

  return c.json(
    {
      data: {
        id: created.data.user?.id,
        email: created.data.user?.email,
      },
    },
    201,
  );
});
