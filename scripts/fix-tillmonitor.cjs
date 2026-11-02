const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Checkout/MpesaPayment/TillMonitor.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix string literal on line 239
content = content.replace(
  "-name- (M-Pesa).replace('-name-', detectedPayment.customerName)",
  "`${detectedPayment.customerName} (M-Pesa)`"
);

// Fix transaction typing for mpesaCode
content = content.replace(
  /transactions\.map\(t => t\.mpesaCode\)/g,
  "transactions.map((t: any) => t.mpesaCode)"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed TillMonitor.tsx');
