import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import * as stockService from '../services/stock.js';

export const stockRoutes = new Hono<{ Variables: AuthVariables }>();

stockRoutes.use('*', requireAuth);

stockRoutes.get('/', async (c) => {
  const grouped = c.req.query('grouped');
  if (grouped === '1' || grouped === 'true') {
    const data = await stockService.listStockGrouped(c.get('userId'));
    return c.json({ data });
  }
  const data = await stockService.listStock(c.get('userId'));
  return c.json({ data });
});

stockRoutes.get('/:id', async (c) => {
  const data = await stockService.getStock(c.get('userId'), c.req.param('id'));
  return c.json({ data });
});

stockRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    name?: string;
    categoryId?: string;
    quantity?: number;
    unit?: string;
    price?: number;
    minimumStock?: number;
  }>();

  const data = await stockService.createStock(c.get('userId'), {
    name: body.name ?? '',
    categoryId: body.categoryId ?? '',
    quantity: body.quantity ?? 0,
    unit: body.unit ?? '',
    price: body.price ?? 0,
    minimumStock: body.minimumStock ?? 0,
  });
  return c.json({ data }, 201);
});

stockRoutes.patch('/:id', async (c) => {
  const body = await c.req.json<{
    name?: string;
    categoryId?: string;
    unit?: string;
    price?: number;
    minimumStock?: number;
  }>();
  const data = await stockService.updateStock(c.get('userId'), c.req.param('id'), body);
  return c.json({ data });
});

stockRoutes.delete('/:id', async (c) => {
  const data = await stockService.deleteStock(c.get('userId'), c.req.param('id'));
  return c.json({ data });
});

stockRoutes.post('/:id/increase', async (c) => {
  const body = await c.req.json<{ amount?: number }>();
  const data = await stockService.adjustStock(
    c.get('userId'),
    c.req.param('id'),
    body.amount ?? 0,
    'increase',
  );
  return c.json({ data });
});

stockRoutes.post('/:id/decrease', async (c) => {
  const body = await c.req.json<{ amount?: number }>();
  const data = await stockService.adjustStock(
    c.get('userId'),
    c.req.param('id'),
    body.amount ?? 0,
    'decrease',
  );
  return c.json({ data });
});
