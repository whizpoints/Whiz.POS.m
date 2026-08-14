const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function getApiKey() {
  const terminal = await prisma.terminal.findFirst();
  console.log(terminal ? terminal.apiKey : 'no terminal');
}
getApiKey().finally(() => prisma.$disconnect());
