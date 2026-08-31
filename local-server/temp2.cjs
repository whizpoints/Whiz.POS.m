const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const terminals = await prisma.terminal.findMany();
    console.log(terminals);
}
main().finally(() => process.exit(0));
