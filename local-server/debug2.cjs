const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const apiKey = '2394072824ca9547d3c531169af6a316b6c436d92df5620146fb2a0fce9511f2';
  const terminal = await prisma.terminal.findFirst({ where: { apiKey } });
  console.log('Terminal:', terminal);
  const outlet = await prisma.outlet.findFirst({ 
    where: { name: terminal.name },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Outlet:', outlet);
  
  const products = await prisma.product.findMany({ 
        where: { 
          businessId: outlet.businessId, 
          inventory: { some: { outletId: outlet.id } },
          OR: [
            { updatedAt: { gt: new Date('2020-01-01') } },
            { inventory: { some: { updatedAt: { gt: new Date('2020-01-01') }, outletId: outlet.id } } }
          ]
        } 
      });
  console.log('Products length:', products.length);
}
main().finally(() => prisma.$disconnect());
