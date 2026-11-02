const fs = require('fs');

// 1. Update StkPush.tsx
let stk = fs.readFileSync('src/components/Checkout/MpesaPayment/StkPush.tsx', 'utf8');
stk = stk.replace(
  'const activeBusinessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;',
  'const activeBusinessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId || (businessSetup as any)?.id;'
);

const oldFetchBlock = `      // Always route to Cloud URL (Web Portal) for STK push to handle HTTPS callbacks
      const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';
      const res = await fetch(\`\${cloudUrl}/api/mpesa/stkpush\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: validPhone, amount: totalAmount, businessId: activeBusinessId, locationId: (businessSetup as any)?.locationId })
      });`;

const newFetchBlock = `      const primaryUrl = (businessSetup?.apiUrl || businessSetup?.backOfficeUrl || '').replace(/\\/$/, '');
      const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';
      const targetUrl = primaryUrl || cloudUrl;

      let res = await fetch(\`\${targetUrl}/api/mpesa/stkpush\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: validPhone, amount: totalAmount, businessId: activeBusinessId, locationId: (businessSetup as any)?.locationId })
      }).catch(() => null);

      if ((!res || !res.ok) && primaryUrl && primaryUrl !== cloudUrl) {
        res = await fetch(\`\${cloudUrl}/api/mpesa/stkpush\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: validPhone, amount: totalAmount, businessId: activeBusinessId, locationId: (businessSetup as any)?.locationId })
        }).catch(() => null);
      }

      if (!res) throw new Error('Network error reaching M-Pesa gateway');`;

if (stk.includes('// Always route to Cloud URL')) {
  stk = stk.replace(oldFetchBlock, newFetchBlock);
} else {
  // Line-by-line fallback
  stk = stk.replace(
    "const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';",
    "const cloudUrl = (businessSetup?.apiUrl || businessSetup?.backOfficeUrl || import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app').replace(/\\/$/, '');"
  );
}
fs.writeFileSync('src/components/Checkout/MpesaPayment/StkPush.tsx', stk, 'utf8');
console.log('StkPush updated');

// 2. Update TillMonitor.tsx
let till = fs.readFileSync('src/components/Checkout/MpesaPayment/TillMonitor.tsx', 'utf8');
till = till.replace(
  'const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;',
  'const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId || (businessSetup as any)?.id;'
);
till = till.replace(
  "const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';",
  "const cloudUrl = (businessSetup?.apiUrl || businessSetup?.backOfficeUrl || import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app').replace(/\\/$/, '');"
);
fs.writeFileSync('src/components/Checkout/MpesaPayment/TillMonitor.tsx', till, 'utf8');
console.log('TillMonitor updated');

// 3. Update SearchModal.tsx
let search = fs.readFileSync('src/components/Checkout/MpesaPayment/SearchModal.tsx', 'utf8');
search = search.replace(
  'const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;',
  'const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId || (businessSetup as any)?.id;'
);
search = search.replace(
  "const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';",
  "const cloudUrl = (businessSetup?.apiUrl || businessSetup?.backOfficeUrl || import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app').replace(/\\/$/, '');"
);
fs.writeFileSync('src/components/Checkout/MpesaPayment/SearchModal.tsx', search, 'utf8');
console.log('SearchModal updated');

// 4. Update MpesaQR.tsx
let qr = fs.readFileSync('src/components/Checkout/MpesaPayment/MpesaQR.tsx', 'utf8');
qr = qr.replace(
  "const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';",
  "const businessSetup = usePosStore.getState().businessSetup;\n        const cloudUrl = (businessSetup?.apiUrl || businessSetup?.backOfficeUrl || import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app').replace(/\\/$/, '');"
);
fs.writeFileSync('src/components/Checkout/MpesaPayment/MpesaQR.tsx', qr, 'utf8');
console.log('MpesaQR updated');
