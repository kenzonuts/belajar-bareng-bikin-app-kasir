import { createClient } from '@supabase/supabase-js';
import { PrismaClient, TransactionType } from '@prisma/client';
import { loadEnv } from '../config/env.js';
import { createApp } from '../app.js';

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function json<T>(
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const res = await app.request(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as T };
}

async function main() {
  console.log('[validate-core] Phase 04 API validation…');
  const env = loadEnv();
  const app = createApp();
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const password = 'CoreTestPassword123!';
  const email = `core-${stamp}@kas-stock.test`;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Core Tester' },
  });
  assert(created.data.user, 'failed to create auth user');
  const userId = created.data.user.id;

  await prisma.user.upsert({
    where: { id: userId },
    update: { name: 'Core Tester', email },
    create: { id: userId, name: 'Core Tester', email },
  });

  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await anon.auth.signInWithPassword({ email, password });
  assert(login.data.session?.access_token, 'login failed');
  const token = login.data.session.access_token;

  const cat = await json<{ data: { id: string; name: string } }>(app, 'POST', '/categories', token, {
    name: 'Minuman',
    description: 'Test',
  });
  assert(cat.status === 201, `create category failed: ${cat.status}`);
  console.log('  ✓ categories create');

  const stock = await json<{ data: { id: string; quantity: number } }>(app, 'POST', '/stock', token, {
    name: 'Aqua',
    categoryId: cat.body.data.id,
    quantity: 10,
    unit: 'botol',
    price: 3000,
    minimumStock: 5,
  });
  assert(stock.status === 201, 'create stock failed');
  console.log('  ✓ stock create');

  const up = await json<{ data: { quantity: number } }>(
    app,
    'POST',
    `/stock/${stock.body.data.id}/increase`,
    token,
    { amount: 5 },
  );
  assert(up.body.data.quantity === 15, `increase failed: ${up.body.data.quantity}`);
  console.log('  ✓ stock increase');

  const down = await json<{ data: { quantity: number } }>(
    app,
    'POST',
    `/stock/${stock.body.data.id}/decrease`,
    token,
    { amount: 3 },
  );
  assert(down.body.data.quantity === 12, 'decrease failed');
  console.log('  ✓ stock decrease');

  const insufficient = await json<{ error: string; code?: string }>(
    app,
    'POST',
    `/stock/${stock.body.data.id}/decrease`,
    token,
    { amount: 100 },
  );
  assert(insufficient.status === 400, 'insufficient stock should fail');
  console.log('  ✓ stock cannot go negative');

  const income = await json<{ data: { id: string } }>(app, 'POST', '/transactions', token, {
    type: TransactionType.INCOME,
    amount: 1000000,
    description: 'Penjualan',
    transactionDate: '2026-08-01',
  });
  assert(income.status === 201, 'income create failed');

  const expense = await json<{ data: { id: string } }>(app, 'POST', '/transactions', token, {
    type: TransactionType.EXPENSE,
    amount: 300000,
    description: 'Restock',
    transactionDate: '2026-08-02',
  });
  assert(expense.status === 201, 'expense create failed');
  console.log('  ✓ income/expense create');

  let dash = await json<{ balance: number; income: number; expense: number }>(
    app,
    'GET',
    '/dashboard',
    token,
  );
  assert(dash.body.balance === 700000, `balance expected 700000 got ${dash.body.balance}`);
  console.log('  ✓ balance 700000');

  await json(app, 'DELETE', `/transactions/${expense.body.data.id}`, token);
  dash = await json(app, 'GET', '/dashboard', token);
  assert(dash.body.balance === 1000000, `balance expected 1000000 got ${dash.body.balance}`);
  console.log('  ✓ balance after delete expense');

  await json(app, 'POST', '/transactions', token, {
    type: 'EXPENSE',
    amount: 500000,
    description: 'Ops',
    transactionDate: '2026-08-03',
  });
  dash = await json(app, 'GET', '/dashboard', token);
  assert(dash.body.balance === 500000, `balance expected 500000 got ${dash.body.balance}`);
  console.log('  ✓ balance after new expense');

  const blockedDelete = await json<{ code?: string }>(
    app,
    'DELETE',
    `/categories/${cat.body.data.id}`,
    token,
  );
  assert(blockedDelete.status === 409, 'category with stock should be blocked');
  console.log('  ✓ category delete blocked when has stock');

  // cleanup
  const items = await prisma.stockItem.findMany({ where: { category: { userId } } });
  await prisma.stockItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await admin.auth.admin.deleteUser(userId);
  console.log('  ✓ cleanup');
  console.log('[validate-core] all checks passed');
}

main()
  .catch((error) => {
    console.error('[validate-core] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
