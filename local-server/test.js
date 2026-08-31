const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.business.findFirst().then(console.log).finally(()=>prisma.$disconnect());
