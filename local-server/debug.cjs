const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Outlets:');
  console.log(await prisma.outlet.findMany());
  console.log('Terminals:');
  console.log(await prisma.terminal.findMany());
  console.log('Inventory:');
  console.log(await prisma.productInventory.findMany());
}

main().finally(() => prisma.$disconnect());
