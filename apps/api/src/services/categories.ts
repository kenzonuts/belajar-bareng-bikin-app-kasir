import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';

function normalizeName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw badRequest('Nama kategori wajib diisi.');
  }
  return trimmed;
}

export async function listCategories(userId: string) {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { stockItems: true } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    itemCount: category._count.stockItems,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }));
}

export async function getCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({
    where: { id, userId },
    include: { _count: { select: { stockItems: true } } },
  });

  if (!category) {
    throw notFound('Kategori tidak ditemukan.');
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    itemCount: category._count.stockItems,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export async function createCategory(
  userId: string,
  input: { name: string; description?: string | null },
) {
  const name = normalizeName(input.name);
  const description = input.description?.trim() || null;

  try {
    const category = await prisma.category.create({
      data: { userId, name, description },
    });
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      itemCount: 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('Kategori dengan nama ini sudah ada.', 'DUPLICATE_CATEGORY');
    }
    throw error;
  }
}

export async function updateCategory(
  userId: string,
  id: string,
  input: { name?: string; description?: string | null },
) {
  await getCategory(userId, id);

  const data: Prisma.CategoryUpdateInput = {};
  if (input.name !== undefined) {
    data.name = normalizeName(input.name);
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { stockItems: true } } },
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      itemCount: category._count.stockItems,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('Kategori dengan nama ini sudah ada.', 'DUPLICATE_CATEGORY');
    }
    throw error;
  }
}

export async function deleteCategory(userId: string, id: string) {
  const category = await getCategory(userId, id);

  if (category.itemCount > 0) {
    throw conflict(
      `Kategori "${category.name}" masih memiliki ${category.itemCount} barang. Hapus atau pindahkan barang terlebih dahulu.`,
      'CATEGORY_HAS_ITEMS',
    );
  }

  await prisma.category.delete({ where: { id } });
  return { id };
}
