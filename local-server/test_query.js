import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: 'file:./server/local.db' } } });

async function run() {
  const business = await prisma.business.findFirst();
  const outlet = await prisma.outlet.findFirst();
  
  if (!business || !outlet) return console.log('No business or outlet');
  
  const products = await prisma.product.findMany({
    where: {
      businessId: business.id,
      OR: [
        { updatedAt: { gt: new Date('2020-01-01') } },
        { inventory: { some: { updatedAt: { gt: new Date('2020-01-01') }, outletId: outlet.id } } }
      ]
    }
  });
  
  console.log('Products:', products.length);
  
  const categories = await prisma.category.findMany({
    where: { businessId: business.id }
  });
  console.log('Categories:', categories.length);
  process.exit(0);
}
run();
