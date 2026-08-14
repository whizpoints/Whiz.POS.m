const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businesses = await prisma.business.findMany();
  for (const b of businesses) {
    let loc = await prisma.storeLocation.findFirst({ where: { businessId: b.id } });
    if (!loc) {
      loc = await prisma.storeLocation.create({ data: { businessId: b.id, name: 'Main Branch' }});
    }
    const products = await prisma.product.findMany({ where: { businessId: b.id } });
    for (const p of products) {
      try {
        await prisma.productInventory.create({
          data: {
            productId: p.id,
            locationId: loc.id,
            stock: p.stock || 0,
            reorderLevel: p.reorderLevel || 5
          }
        });
        console.log('Migrated', p.name);
      } catch (e) {
        // already exists
      }
    }
  }
}
main().then(() => prisma.$disconnect());
