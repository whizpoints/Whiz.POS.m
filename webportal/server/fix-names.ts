import prisma from './db.js';

async function main() {
  const users = await prisma.user.findMany({
    where: { name: 'Admin' },
    include: { business: true }
  });
  
  console.log(`Found ${users.length} users with name 'Admin'.`);
  
  for (const user of users) {
    if (user.business && user.business.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: user.business.name }
      });
      console.log(`Updated user ${user.email} to name: ${user.business.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
