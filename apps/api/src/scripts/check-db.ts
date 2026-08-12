import { checkDatabaseConnection, prisma } from '../db/prisma.js';
import { loadEnv } from '../config/env.js';

async function main() {
  const env = loadEnv();
  await checkDatabaseConnection();

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'categories', 'stock_items', 'transactions')
    ORDER BY table_name
  `;

  console.log('Database connection ok');
  console.log(`Supabase URL: ${env.SUPABASE_URL}`);
  console.log(`Tables: ${tables.map((t) => t.table_name).join(', ') || '(none — run migrations)'}`);
}

main()
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
