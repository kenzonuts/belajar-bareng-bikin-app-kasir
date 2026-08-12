import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === 'number' ? value : Number(value);
}

function serializeStockItem(item: {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: Prisma.Decimal;
  minimumStock: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string };
}) {
  const quantity = item.quantity;
  const minimumStock = item.minimumStock;
  return {
    id: item.id,
    name: item.name,
    quantity,
    unit: item.unit,
    price: toNumber(item.price),
    minimumStock,
    categoryId: item.categoryId,
    categoryName: item.category?.name ?? null,
    isLowStock: quantity <= minimumStock,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function assertCategoryOwned(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, name: true },
  });
  if (!category) {
    throw badRequest('Kategori tidak valid atau bukan milik Anda.');
  }
  return category;
}

async function getOwnedStock(userId: string, id: string) {
  const item = await prisma.stockItem.findFirst({
    where: {
      id,
      category: { userId },
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  if (!item) {
    throw notFound('Barang tidak ditemukan.');
  }

  return item;
}

export async function listStock(userId: string) {
  const items = await prisma.stockItem.findMany({
    where: { category: { userId } },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  return items.map(serializeStockItem);
}

export async function listStockGrouped(userId: string) {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      stockItems: {
        orderBy: { name: 'asc' },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    items: category.stockItems.map((item) =>
      serializeStockItem({
        ...item,
        category: { id: category.id, name: category.name },
      }),
    ),
  }));
}

export async function getStock(userId: string, id: string) {
  const item = await getOwnedStock(userId, id);
  return serializeStockItem(item);
}

export async function createStock(
  userId: string,
  input: {
    name: string;
    categoryId: string;
    quantity: number;
    unit: string;
    price: number;
    minimumStock: number;
  },
) {
  const name = input.name.trim();
  const unit = input.unit.trim();

  if (!name) throw badRequest('Nama barang wajib diisi.');
  if (!input.categoryId) throw badRequest('Kategori wajib dipilih.');
  if (!unit) throw badRequest('Satuan wajib diisi.');
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw badRequest('Jumlah harus >= 0.');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw badRequest('Harga harus >= 0.');
  }
  if (!Number.isFinite(input.minimumStock) || input.minimumStock < 0) {
    throw badRequest('Minimum stok harus >= 0.');
  }

  await assertCategoryOwned(userId, input.categoryId);

  const item = await prisma.stockItem.create({
    data: {
      name,
      categoryId: input.categoryId,
      quantity: Math.trunc(input.quantity),
      unit,
      price: new Prisma.Decimal(input.price),
      minimumStock: Math.trunc(input.minimumStock),
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return serializeStockItem(item);
}

export async function updateStock(
  userId: string,
  id: string,
  input: {
    name?: string;
    categoryId?: string;
    unit?: string;
    price?: number;
    minimumStock?: number;
  },
) {
  await getOwnedStock(userId, id);

  const data: Prisma.StockItemUpdateInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw badRequest('Nama barang wajib diisi.');
    data.name = name;
  }

  if (input.unit !== undefined) {
    const unit = input.unit.trim();
    if (!unit) throw badRequest('Satuan wajib diisi.');
    data.unit = unit;
  }

  if (input.price !== undefined) {
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw badRequest('Harga harus >= 0.');
    }
    data.price = new Prisma.Decimal(input.price);
  }

  if (input.minimumStock !== undefined) {
    if (!Number.isFinite(input.minimumStock) || input.minimumStock < 0) {
      throw badRequest('Minimum stok harus >= 0.');
    }
    data.minimumStock = Math.trunc(input.minimumStock);
  }

  if (input.categoryId !== undefined) {
    await assertCategoryOwned(userId, input.categoryId);
    data.category = { connect: { id: input.categoryId } };
  }

  const item = await prisma.stockItem.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true } } },
  });

  return serializeStockItem(item);
}

export async function deleteStock(userId: string, id: string) {
  await getOwnedStock(userId, id);
  await prisma.stockItem.delete({ where: { id } });
  return { id };
}

export async function adjustStock(
  userId: string,
  id: string,
  amount: number,
  direction: 'increase' | 'decrease',
) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw badRequest('Jumlah penyesuaian harus bilangan bulat > 0.');
  }

  await getOwnedStock(userId, id);

  const delta = direction === 'increase' ? amount : -amount;

  const updated = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      price: Prisma.Decimal;
      minimum_stock: number;
      category_id: string;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    UPDATE stock_items AS s
    SET
      quantity = s.quantity + ${delta},
      updated_at = NOW()
    FROM categories AS c
    WHERE s.id = ${id}::uuid
      AND s.category_id = c.id
      AND c.user_id = ${userId}::uuid
      AND s.quantity + ${delta} >= 0
    RETURNING
      s.id,
      s.name,
      s.quantity,
      s.unit,
      s.price,
      s.minimum_stock,
      s.category_id,
      s.created_at,
      s.updated_at
  `;

  if (updated.length === 0) {
    const current = await getOwnedStock(userId, id);
    if (direction === 'decrease') {
      throw badRequest(
        `Stok tidak mencukupi. Stok tersedia: ${current.quantity}`,
        'INSUFFICIENT_STOCK',
      );
    }
    throw notFound('Barang tidak ditemukan.');
  }

  const row = updated[0]!;
  const category = await prisma.category.findFirst({
    where: { id: row.category_id, userId },
    select: { id: true, name: true },
  });

  return serializeStockItem({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    price: row.price,
    minimumStock: row.minimum_stock,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: category ?? undefined,
  });
}

export async function listLowStock(userId: string, limit = 10) {
  const items = await prisma.stockItem.findMany({
    where: { category: { userId } },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { quantity: 'asc' },
  });

  return items
    .filter((item) => item.quantity <= item.minimumStock)
    .slice(0, limit)
    .map(serializeStockItem);
}
