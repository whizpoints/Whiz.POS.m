import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Inventory Migration...');
  
  const businesses = await prisma.business.findMany();
  let migratedCount = 0;
  
  for (const business of businesses) {
    console.log(`Processing Business: ${business.name} (${business.id})`);
    
    // 1. Find or create default StoreLocation
    let defaultLocation = await prisma.storeLocation.findFirst({
      where: { businessId: business.id }
    });
    
    if (!defaultLocation) {
      defaultLocation = await prisma.storeLocation.create({
        data: {
          businessId: business.id,
          name: 'Main Branch',
          address: 'Headquarters'
        }
      });
      console.log(`  -> Created default location: ${defaultLocation.name} (${defaultLocation.id})`);
    } else {
      console.log(`  -> Found existing location: ${defaultLocation.name} (${defaultLocation.id})`);
    }

    // 2. Fetch all products for this business
    const products = await prisma.product.findMany({
      where: { businessId: business.id }
    });
    
    console.log(`  -> Found ${products.length} products. Migrating stock to ProductInventory...`);
    
    for (const product of products) {
      // 3. Upsert ProductInventory
      await prisma.productInventory.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: defaultLocation.id
          }
        },
        create: {
          productId: product.id,
          locationId: defaultLocation.id,
          stock: (product as any).stock || 0,
          reorderLevel: (product as any).reorderLevel || 5
        },
        update: {} 
      });
      migratedCount++;
    }
  }
  
  console.log(`\nMigration completed successfully! Migrated ${migratedCount} inventory records.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
