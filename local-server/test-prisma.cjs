const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = "cmsuwezqp0001ntjrq6vubjul"; // using the businessId from check-items
  const receipt = await prisma.receipt.create({
    data: {
      businessId,
      receiptNumber: "TXN_TEST_" + Date.now(),
      totalAmount: 100,
      paymentMethod: "cash",
      status: "COMPLETED",
      items: {
        create: [
          {
            productName: "Test Item 1",
            quantity: 2,
            unitPrice: 50,
            totalPrice: 100
          }
        ]
      }
    },
    include: { items: true }
  });
  console.log("Created receipt with items:", JSON.stringify(receipt, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
