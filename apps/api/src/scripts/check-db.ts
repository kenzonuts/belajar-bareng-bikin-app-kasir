import { checkDatabaseConnection, prisma } from '../db/prisma.js';

async function main() {
  await checkDatabaseConnection();
  console.log('Database connection ok');
}

main()
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
