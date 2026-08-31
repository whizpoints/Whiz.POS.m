import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const receipts = await prisma.receipt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { items: true }
  });
  console.log(JSON.stringify(receipts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
