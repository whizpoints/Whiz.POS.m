const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const outlets = await prisma.outlet.findMany();
  console.log('Outlets:', outlets);
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
