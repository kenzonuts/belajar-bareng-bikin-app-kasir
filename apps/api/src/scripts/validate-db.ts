import { Prisma, PrismaClient, TransactionType } from '@prisma/client';
import { hash } from 'bcryptjs';

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
  console.log('[validate] Phase 02 database validation…');

  await prisma.$queryRaw`SELECT 1`;
  console.log('  ✓ database connection');

  const password = await hash('ValidatePassword123!', 10);

  const user = await prisma.user.create({
    data: {
      name: 'Validator',
      email: `validator-${Date.now()}@kas-stock.local`,
      password,
    },
  });
  console.log('  ✓ users create');

  const readUser = await prisma.user.findUnique({ where: { id: user.id } });
  assert(readUser?.email === user.email, 'user read failed');
  console.log('  ✓ users read');

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { name: 'Validator Updated' },
  });
  assert(updatedUser.name === 'Validator Updated', 'user update failed');
  console.log('  ✓ users update');

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name: 'Minuman',
      description: 'Validation category',
    },
  });
  console.log('  ✓ categories create + user ownership');

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  assert(categories.length === 1, 'categories read failed');
  console.log('  ✓ categories read');

  await prisma.category.update({
    where: { id: category.id },
    data: { description: 'Updated description' },
  });
  console.log('  ✓ categories update');

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
  assert(stock.categoryId === category.id, 'stock category relationship failed');
  console.log('  ✓ stock_items create + category relationship');

  const stocks = await prisma.stockItem.findMany({ where: { categoryId: category.id } });
  assert(stocks.length === 1, 'stock read failed');
  console.log('  ✓ stock_items read');

  await prisma.stockItem.update({
    where: { id: stock.id },
    data: { quantity: 12 },
  });
  console.log('  ✓ stock_items update');

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

  const income = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: TransactionType.INCOME,
      amount: 500000,
      description: 'Validation income',
      transactionDate: new Date('2026-08-01'),
    },
  });
  console.log('  ✓ transactions create INCOME');

  const expense = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: TransactionType.EXPENSE,
      amount: 150000,
      description: 'Validation expense',
      transactionDate: new Date('2026-08-02'),
    },
  });
  console.log('  ✓ transactions create EXPENSE');

  const txns = await prisma.transaction.findMany({ where: { userId: user.id } });
  assert(txns.length === 2, 'transactions read failed');
  console.log('  ✓ transactions read');

  await prisma.transaction.update({
    where: { id: income.id },
    data: { description: 'Validation income updated' },
  });
  console.log('  ✓ transactions update');

  await expectReject('non-positive amount', () =>
    prisma.transaction.create({
      data: {
        userId: user.id,
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

  await prisma.transaction.delete({ where: { id: expense.id } });
  console.log('  ✓ transactions delete');

  await prisma.stockItem.delete({ where: { id: stock.id } });
  console.log('  ✓ stock_items delete');

  await prisma.category.delete({ where: { id: category.id } });
  console.log('  ✓ categories delete');

  const rls = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
    SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('users', 'categories', 'stock_items', 'transactions')
    ORDER BY c.relname
  `;

  for (const row of rls) {
    assert(row.rowsecurity, `RLS not enabled on ${row.tablename}`);
  }
  console.log('  ✓ RLS enabled on all tables');

  const policies = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'categories', 'stock_items', 'transactions')
  `;
  assert(Number(policies[0]?.count ?? 0) >= 14, 'expected RLS policies missing');
  console.log(`  ✓ RLS policies present (${policies[0]?.count})`);

  // cleanup validation user + remaining income
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
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
