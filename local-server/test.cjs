const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const sinceDate = new Date('2000-01-01');
  const businessId = 'test';
  
  try { await prisma.user.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }); console.log('user ok'); } catch(e) { console.error('user error', e.message); }
  try { await prisma.product.findMany({ where: { businessId, updatedAt: { gt: sinceDate }, inventory: { some: { outletId: 'test' } } } }); console.log('product ok'); } catch(e) { console.error('product error', e.message); }
  try { await prisma.productInventory.findMany({ where: { updatedAt: { gt: sinceDate }, product: { businessId } }, include: { product: true } }); console.log('inventory ok'); } catch(e) { console.error('inventory error', e.message); }
  try { await prisma.customer.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }); console.log('customer ok'); } catch(e) { console.error('customer error', e.message); }
  try { await prisma.supplier.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }); console.log('supplier ok'); } catch(e) { console.error('supplier error', e.message); }
  try { await prisma.receipt.findMany({ where: { businessId, updatedAt: { gt: sinceDate } } }); console.log('receipt ok'); } catch(e) { console.error('receipt error', e.message); }
}
test().finally(() => prisma.$disconnect());
