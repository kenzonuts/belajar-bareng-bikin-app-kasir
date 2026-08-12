import { PrismaClient, TransactionType } from '@prisma/client';
import { getSupabaseAdmin } from '../src/db/supabase.js';

const prisma = new PrismaClient();

const DEV_EMAIL = 'dev@kas-stock.local';
const DEV_PASSWORD = 'DevPassword123!';
const DEV_NAME = 'Developer';

async function ensureAuthUser() {
  const admin = getSupabaseAdmin();

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) {
    throw listed.error;
  }

  const existing = listed.data.users.find((user) => user.email === DEV_EMAIL);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { name: DEV_NAME },
    });

    await prisma.user.upsert({
      where: { id: existing.id },
      update: { name: DEV_NAME, email: DEV_EMAIL },
      create: { id: existing.id, name: DEV_NAME, email: DEV_EMAIL },
    });

    return existing.id;
  }

  const created = await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { name: DEV_NAME },
  });

  if (created.error || !created.data.user) {
    throw created.error ?? new Error('Failed to create auth user');
  }

  // Trigger usually creates the profile; upsert as a safety net.
  await prisma.user.upsert({
    where: { id: created.data.user.id },
    update: { name: DEV_NAME, email: DEV_EMAIL },
    create: {
      id: created.data.user.id,
      name: DEV_NAME,
      email: DEV_EMAIL,
    },
  });

  return created.data.user.id;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed is for development only. Refusing to run in production.');
  }

  console.log('[seed] starting development seed…');

  const userId = await ensureAuthUser();

  const categoryDefs = [
    { name: 'Minuman', description: 'Minuman kemasan' },
    { name: 'Makanan', description: 'Makanan siap saji' },
    { name: 'Snack', description: 'Cemilan' },
    { name: 'ATK', description: 'Alat tulis kantor' },
  ] as const;

  const categories = [];
  for (const def of categoryDefs) {
    const category = await prisma.category.upsert({
      where: {
        userId_name: {
          userId,
          name: def.name,
        },
      },
      update: {
        description: def.description,
      },
      create: {
        userId,
        name: def.name,
        description: def.description,
      },
    });
    categories.push(category);
  }

  const minuman = categories.find((c) => c.name === 'Minuman');
  if (!minuman) {
    throw new Error('Minuman category missing after seed');
  }

  const stockDefs = [
    { name: 'Aqua', quantity: 48, unit: 'botol', price: 3000, minimumStock: 12 },
    { name: 'Teh Pucuk', quantity: 36, unit: 'botol', price: 4000, minimumStock: 10 },
    { name: 'Coca Cola', quantity: 24, unit: 'botol', price: 8000, minimumStock: 8 },
  ] as const;

  for (const item of stockDefs) {
    const existing = await prisma.stockItem.findFirst({
      where: {
        categoryId: minuman.id,
        name: item.name,
      },
    });

    if (existing) {
      await prisma.stockItem.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.stockItem.create({
        data: {
          categoryId: minuman.id,
          ...item,
        },
      });
    }
  }

  await prisma.transaction.deleteMany({
    where: {
      userId,
      description: {
        in: ['Seed income — modal awal', 'Seed expense — belanja stok'],
      },
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId,
        type: TransactionType.INCOME,
        amount: 500000,
        description: 'Seed income — modal awal',
        transactionDate: new Date('2026-08-01'),
      },
      {
        userId,
        type: TransactionType.EXPENSE,
        amount: 150000,
        description: 'Seed expense — belanja stok',
        transactionDate: new Date('2026-08-02'),
      },
    ],
  });

  console.log('[seed] done');
  console.log(`[seed] auth user: ${DEV_EMAIL} / ${DEV_PASSWORD}`);
  console.log(`[seed] categories: ${categories.map((c) => c.name).join(', ')}`);
  console.log('[seed] stock: Aqua, Teh Pucuk, Coca Cola');
  console.log('[seed] transactions: INCOME 500000, EXPENSE 150000');
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
