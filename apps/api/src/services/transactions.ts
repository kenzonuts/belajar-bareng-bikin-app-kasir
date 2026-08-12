import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === 'number' ? value : Number(value);
}

function serializeTransaction(txn: {
  id: string;
  type: TransactionType;
  amount: Prisma.Decimal;
  description: string | null;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: txn.id,
    type: txn.type,
    amount: toNumber(txn.amount),
    description: txn.description,
    transactionDate: txn.transactionDate.toISOString().slice(0, 10),
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt,
  };
}

function parseType(type: string): TransactionType {
  if (type === 'INCOME' || type === 'EXPENSE') {
    return type;
  }
  throw badRequest('Tipe transaksi harus INCOME atau EXPENSE.');
}

function parseAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest('Nominal harus lebih dari 0.');
  }
  return new Prisma.Decimal(amount);
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest('Tanggal transaksi tidak valid.');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw badRequest('Tanggal transaksi tidak valid.');
  }
  return date;
}

export async function listTransactions(
  userId: string,
  filter?: { type?: 'INCOME' | 'EXPENSE' | 'ALL' },
) {
  const type =
    filter?.type && filter.type !== 'ALL' ? parseType(filter.type) : undefined;

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map(serializeTransaction);
}

export async function getTransaction(userId: string, id: string) {
  const txn = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!txn) {
    throw notFound('Transaksi tidak ditemukan.');
  }
  return serializeTransaction(txn);
}

export async function createTransaction(
  userId: string,
  input: {
    type: string;
    amount: number;
    description?: string | null;
    transactionDate: string;
  },
) {
  const type = parseType(input.type);
  const amount = parseAmount(input.amount);
  const transactionDate = parseDate(input.transactionDate);
  const description = input.description?.trim() || null;

  const txn = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount,
      description,
      transactionDate,
    },
  });

  return serializeTransaction(txn);
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: {
    type?: string;
    amount?: number;
    description?: string | null;
    transactionDate?: string;
  },
) {
  await getTransaction(userId, id);

  const data: Prisma.TransactionUpdateInput = {};
  if (input.type !== undefined) data.type = parseType(input.type);
  if (input.amount !== undefined) data.amount = parseAmount(input.amount);
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.transactionDate !== undefined) data.transactionDate = parseDate(input.transactionDate);

  const txn = await prisma.transaction.update({
    where: { id },
    data,
  });

  return serializeTransaction(txn);
}

export async function deleteTransaction(userId: string, id: string) {
  await getTransaction(userId, id);
  await prisma.transaction.delete({ where: { id } });
  return { id };
}

export async function getBalanceSummary(userId: string) {
  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId },
    _sum: { amount: true },
  });

  let income = 0;
  let expense = 0;

  for (const row of grouped) {
    const sum = toNumber(row._sum.amount ?? 0);
    if (row.type === 'INCOME') income = sum;
    if (row.type === 'EXPENSE') expense = sum;
  }

  return {
    income,
    expense,
    balance: income - expense,
  };
}
