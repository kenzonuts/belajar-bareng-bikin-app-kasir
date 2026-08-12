import { createClient } from '@supabase/supabase-js';
import { PrismaClient, TransactionType } from '@prisma/client';
import { loadEnv } from '../config/env.js';
import { getSupabaseAdmin } from '../db/supabase.js';

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function createAuthUser(email: string, password: string, name: string) {
  const admin = getSupabaseAdmin();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (created.error || !created.data.user) {
    throw created.error ?? new Error(`Failed to create ${email}`);
  }

  // Ensure profile exists even if trigger timing races.
  await prisma.user.upsert({
    where: { id: created.data.user.id },
    update: { name, email },
    create: { id: created.data.user.id, name, email },
  });

  return created.data.user;
}

async function deleteAuthUser(userId: string) {
  // Remove dependent app data first (RESTRICT FKs).
  const categories = await prisma.category.findMany({
    where: { userId },
    select: { id: true },
  });
  const categoryIds = categories.map((c) => c.id);

  if (categoryIds.length > 0) {
    await prisma.stockItem.deleteMany({ where: { categoryId: { in: categoryIds } } });
  }
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  const admin = getSupabaseAdmin();
  await admin.auth.admin.deleteUser(userId);
}

async function main() {
  console.log('[validate-auth] Phase 03 auth + RLS validation…');
  const env = loadEnv();

  const stamp = Date.now();
  const password = 'AuthTestPassword123!';
  const userAEmail = `user-a-${stamp}@kas-stock.test`;
  const userBEmail = `user-b-${stamp}@kas-stock.test`;

  const userA = await createAuthUser(userAEmail, password, 'User A');
  const userB = await createAuthUser(userBEmail, password, 'User B');
  console.log('  ✓ Supabase Auth register (admin createUser)');

  const profileA = await prisma.user.findUnique({ where: { id: userA.id } });
  assert(profileA?.email === userAEmail, 'profile A missing');
  assert(!('password' in (profileA as object)), 'password must not exist on profile');
  console.log('  ✓ public.users profile created without password');

  const clientA = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const loginA = await clientA.auth.signInWithPassword({ email: userAEmail, password });
  assert(!loginA.error && loginA.data.session, `login A failed: ${loginA.error?.message}`);
  console.log('  ✓ login User A');

  const loginB = await clientB.auth.signInWithPassword({ email: userBEmail, password });
  assert(!loginB.error && loginB.data.session, `login B failed: ${loginB.error?.message}`);
  console.log('  ✓ login User B');

  const categoryA = await clientA
    .from('categories')
    .insert({
      user_id: userA.id,
      name: 'Minuman',
      description: 'Owned by A',
    })
    .select('id')
    .single();
  assert(!categoryA.error && categoryA.data, `create category A failed: ${categoryA.error?.message}`);
  console.log('  ✓ User A can create category');

  const stockA = await clientA
    .from('stock_items')
    .insert({
      category_id: categoryA.data.id,
      name: 'Aqua',
      quantity: 10,
      unit: 'botol',
      price: 3000,
      minimum_stock: 2,
    })
    .select('id')
    .single();
  assert(!stockA.error && stockA.data, `create stock A failed: ${stockA.error?.message}`);
  console.log('  ✓ User A can create stock item');

  const txnA = await clientA
    .from('transactions')
    .insert({
      user_id: userA.id,
      type: TransactionType.INCOME,
      amount: 500000,
      description: 'Income A',
      transaction_date: '2026-08-01',
    })
    .select('id')
    .single();
  assert(!txnA.error && txnA.data, `create txn A failed: ${txnA.error?.message}`);
  console.log('  ✓ User A can create transaction');

  const readOwn = await clientA.from('categories').select('id').eq('id', categoryA.data.id);
  assert((readOwn.data?.length ?? 0) === 1, 'User A cannot read own category');
  console.log('  ✓ User A can read own data');

  const leakCategory = await clientB.from('categories').select('id').eq('id', categoryA.data.id);
  assert((leakCategory.data?.length ?? 0) === 0, 'User B leaked category A');
  console.log('  ✓ User B cannot read User A category');

  const leakStock = await clientB.from('stock_items').select('id').eq('id', stockA.data.id);
  assert((leakStock.data?.length ?? 0) === 0, 'User B leaked stock A');
  console.log('  ✓ User B cannot read User A stock');

  const leakTxn = await clientB.from('transactions').select('id').eq('id', txnA.data.id);
  assert((leakTxn.data?.length ?? 0) === 0, 'User B leaked transaction A');
  console.log('  ✓ User B cannot read User A transaction');

  const updateLeak = await clientB
    .from('categories')
    .update({ description: 'hacked' })
    .eq('id', categoryA.data.id)
    .select('id');
  assert((updateLeak.data?.length ?? 0) === 0, 'User B updated User A category');
  console.log('  ✓ User B cannot update User A data');

  const logoutA = await clientA.auth.signOut();
  assert(!logoutA.error, `logout A failed: ${logoutA.error?.message}`);
  const sessionAfter = await clientA.auth.getSession();
  assert(!sessionAfter.data.session, 'session still present after logout');
  console.log('  ✓ logout clears session');

  await deleteAuthUser(userA.id);
  await deleteAuthUser(userB.id);
  console.log('  ✓ cleanup auth users');

  console.log('[validate-auth] all checks passed');
}

main()
  .catch((error) => {
    console.error('[validate-auth] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
