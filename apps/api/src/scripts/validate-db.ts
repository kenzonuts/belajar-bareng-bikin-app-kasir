import { createClient } from '@supabase/supabase-js';
import { Prisma, PrismaClient, TransactionType } from '@prisma/client';
import { loadEnv } from '../config/env.js';
import { getSupabaseAdmin } from '../db/supabase.js';

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectReject(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error(`Expected failure for: ${label}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Expected failure')) {
      throw error;
    }
    console.log(`  ✓ rejected as expected: ${label}`);
  }
}

async function main() {
  console.log('[validate] database validation…');
  const env = loadEnv();
  const admin = getSupabaseAdmin();

  await prisma.$queryRaw`SELECT 1`;
  console.log('  ✓ database connection');

  const email = `validator-${Date.now()}@kas-stock.local`;
  const password = 'ValidatePassword123!';

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Validator' },
  });
  assert(created.data.user, 'auth user create failed');
  const userId = created.data.user.id;

  await prisma.user.upsert({
    where: { id: userId },
    update: { name: 'Validator', email },
    create: { id: userId, name: 'Validator', email },
  });
  console.log('  ✓ users create via auth + profile');

  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `;
  assert(!columns.some((c) => c.column_name === 'password'), 'password column still exists');
  console.log('  ✓ users has no password column');

  const readUser = await prisma.user.findUnique({ where: { id: userId } });
  assert(readUser?.email === email, 'user read failed');
  console.log('  ✓ users read');

  await prisma.user.update({
    where: { id: userId },
    data: { name: 'Validator Updated' },
  });
  console.log('  ✓ users update');

  const category = await prisma.category.create({
    data: {
      userId,
      name: 'Minuman',
      description: 'Validation category',
    },
  });
  console.log('  ✓ categories create + user ownership');

  const stock = await prisma.stockItem.create({
    data: {
      categoryId: category.id,
      name: 'Aqua',
      quantity: 10,
      unit: 'botol',
      price: 3000,
      minimumStock: 2,
    },
  });
  console.log('  ✓ stock_items create + category relationship');

  await expectReject('negative quantity', () =>
    prisma.stockItem.create({
      data: {
        categoryId: category.id,
        name: 'Bad Qty',
        quantity: -1,
        unit: 'pcs',
        price: 1000,
        minimumStock: 0,
      },
    }),
  );

  await expectReject('negative price', () =>
    prisma.stockItem.create({
      data: {
        categoryId: category.id,
        name: 'Bad Price',
        quantity: 1,
        unit: 'pcs',
        price: new Prisma.Decimal(-1),
        minimumStock: 0,
      },
    }),
  );

  await prisma.transaction.create({
    data: {
      userId,
      type: TransactionType.INCOME,
      amount: 500000,
      description: 'Validation income',
      transactionDate: new Date('2026-08-01'),
    },
  });
  console.log('  ✓ transactions create INCOME');

  await expectReject('non-positive amount', () =>
    prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.EXPENSE,
        amount: 0,
        description: 'bad',
        transactionDate: new Date('2026-08-03'),
      },
    }),
  );

  await expectReject('delete category with stock (RESTRICT)', () =>
    prisma.category.delete({ where: { id: category.id } }),
  );

  // Sanity: authenticated client can login
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  assert(!login.error && login.data.session, 'login failed');
  console.log('  ✓ supabase auth login');

  await prisma.stockItem.delete({ where: { id: stock.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await admin.auth.admin.deleteUser(userId);
  console.log('  ✓ cleanup');

  console.log('[validate] all checks passed');
}

main()
  .catch((error) => {
    console.error('[validate] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
