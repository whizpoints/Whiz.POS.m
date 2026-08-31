const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const business = await prisma.business.findFirst();
    if (business) {
        console.log('Name:', business.name);
        console.log('Settings:', business.settings);
    } else {
        console.log('No business found');
    }
}
main().finally(() => prisma.$disconnect());
