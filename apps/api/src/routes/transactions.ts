import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import * as transactionsService from '../services/transactions.js';

export const transactionsRoutes = new Hono<{ Variables: AuthVariables }>();

transactionsRoutes.use('*', requireAuth);

transactionsRoutes.get('/', async (c) => {
  const type = c.req.query('type') as 'INCOME' | 'EXPENSE' | 'ALL' | undefined;
  const data = await transactionsService.listTransactions(c.get('userId'), { type });
  return c.json({ data });
});

transactionsRoutes.get('/:id', async (c) => {
  const data = await transactionsService.getTransaction(c.get('userId'), c.req.param('id'));
  return c.json({ data });
});

transactionsRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    type?: string;
    amount?: number;
    description?: string | null;
    transactionDate?: string;
  }>();

  const data = await transactionsService.createTransaction(c.get('userId'), {
    type: body.type ?? '',
    amount: body.amount ?? 0,
    description: body.description,
    transactionDate: body.transactionDate ?? '',
  });
  return c.json({ data }, 201);
});

transactionsRoutes.patch('/:id', async (c) => {
  const body = await c.req.json<{
    type?: string;
    amount?: number;
    description?: string | null;
    transactionDate?: string;
  }>();
  const data = await transactionsService.updateTransaction(c.get('userId'), c.req.param('id'), body);
  return c.json({ data });
});

transactionsRoutes.delete('/:id', async (c) => {
  const data = await transactionsService.deleteTransaction(c.get('userId'), c.req.param('id'));
  return c.json({ data });
});
