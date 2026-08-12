import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth.js';
import * as categoriesService from '../services/categories.js';

export const categoriesRoutes = new Hono<{ Variables: AuthVariables }>();

categoriesRoutes.use('*', requireAuth);

categoriesRoutes.get('/', async (c) => {
  const data = await categoriesService.listCategories(c.get('userId'));
  return c.json({ data });
});

categoriesRoutes.get('/:id', async (c) => {
  const data = await categoriesService.getCategory(c.get('userId'), c.req.param('id'));
  return c.json({ data });
});

categoriesRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string | null }>();
  const data = await categoriesService.createCategory(c.get('userId'), {
    name: body.name ?? '',
    description: body.description,
  });
  return c.json({ data }, 201);
});

categoriesRoutes.patch('/:id', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string | null }>();
  const data = await categoriesService.updateCategory(c.get('userId'), c.req.param('id'), body);
  return c.json({ data });
});

categoriesRoutes.delete('/:id', async (c) => {
  const data = await categoriesService.deleteCategory(c.get('userId'), c.req.param('id'));
  return c.json({ data });
});
