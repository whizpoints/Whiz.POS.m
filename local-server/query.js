import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const receipt = await prisma.receipt.findFirst({
    include: {
      items: true,
      outlet: { include: { location: true } }
    }
  });
  console.log(JSON.stringify(receipt, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
