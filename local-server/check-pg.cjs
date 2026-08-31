const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const p = await prisma.product.findFirst();
  console.log('Product:', p);
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
