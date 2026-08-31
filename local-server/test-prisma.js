const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.transaction.count();
  console.log('Transactions in local.db:', count);
}
main().catch(console.error).finally(() => prisma.());
