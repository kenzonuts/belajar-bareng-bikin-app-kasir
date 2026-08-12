import { hash } from 'bcryptjs';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_EMAIL = 'dev@kas-stock.local';
const DEV_PASSWORD = 'DevPassword123!';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed is for development only. Refusing to run in production.');
  }

  console.log('[seed] starting development seed…');

  const passwordHash = await hash(DEV_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {
      name: 'Developer',
      password: passwordHash,
    },
    create: {
      name: 'Developer',
      email: DEV_EMAIL,
      password: passwordHash,
    },
  });

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
          userId: user.id,
          name: def.name,
        },
      },
      update: {
        description: def.description,
      },
      create: {
        userId: user.id,
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
      userId: user.id,
      description: {
        in: ['Seed income — modal awal', 'Seed expense — belanja stok'],
      },
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: TransactionType.INCOME,
        amount: 500000,
        description: 'Seed income — modal awal',
        transactionDate: new Date('2026-08-01'),
      },
      {
        userId: user.id,
        type: TransactionType.EXPENSE,
        amount: 150000,
        description: 'Seed expense — belanja stok',
        transactionDate: new Date('2026-08-02'),
      },
    ],
  });

  console.log('[seed] done');
  console.log(`[seed] user: ${user.email} / ${DEV_PASSWORD}`);
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
