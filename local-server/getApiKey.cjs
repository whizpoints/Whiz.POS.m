const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function getApiKey() {
  const business = await prisma.business.findFirst();
  console.log(business.apiKey);
}
getApiKey().finally(() => prisma.$disconnect());
