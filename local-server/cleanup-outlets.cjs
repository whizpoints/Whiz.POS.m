const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupGhostOutlets() {
  const terminals = await prisma.terminal.findMany();
  const terminalNames = terminals.map(t => t.name);

  const outlets = await prisma.outlet.findMany();
  let deletedCount = 0;

  for (const outlet of outlets) {
    if (!terminalNames.includes(outlet.name)) {
      console.log(`Deleting ghost outlet: ${outlet.name}`);
      await prisma.outlet.delete({ where: { id: outlet.id } });
      deletedCount++;
    }
  }
  console.log(`Cleanup complete. Deleted ${deletedCount} ghost outlets.`);
}

cleanupGhostOutlets().catch(console.error).finally(() => prisma.$disconnect());
