const fs = require('fs');
const path = require('path');

// 1. Update src/App.tsx
const appFile = path.resolve(__dirname, '../src/App.tsx');
let appContent = fs.readFileSync(appFile, 'utf8');

const appTarget = `      socket.on('stock_updated', (data) => {
        console.log('[Socket] Stock updated remotely:', data);
        if (typeof usePosStore.getState().syncFromServer === 'function') usePosStore.getState().syncFromServer();
      });`;

const appReplacement = `      socket.on('stock_updated', (data) => {
        console.log('[Socket] Stock updated remotely:', data);
        if (typeof usePosStore.getState().syncFromServer === 'function') usePosStore.getState().syncFromServer();
      });

      socket.on('mpesa_payment_received', (data) => {
        console.log('[Socket] Real-time M-Pesa payment received:', data);
        window.dispatchEvent(new CustomEvent('mpesa_payment_received', { detail: data }));
      });`;

function replaceFlexible(str, oldPart, newPart) {
  const isCRLF = str.includes('\r\n');
  const normOld = oldPart.replace(/\r?\n/g, isCRLF ? '\r\n' : '\n');
  const normNew = newPart.replace(/\r?\n/g, isCRLF ? '\r\n' : '\n');
  return str.replace(normOld, normNew);
}

appContent = replaceFlexible(appContent, appTarget, appReplacement);
fs.writeFileSync(appFile, appContent, 'utf8');
console.log('Successfully updated src/App.tsx');

// 2. Update src/components/Checkout/MpesaPayment/TillMonitor.tsx
const tillFile = path.resolve(__dirname, '../src/components/Checkout/MpesaPayment/TillMonitor.tsx');
let tillContent = fs.readFileSync(tillFile, 'utf8');

const oldPollLogic = `    // Track when this component mounted so we only look for RECENT payments (allow up to 2 mins early)
    const componentMountTime = new Date().getTime() - (2 * 60 * 1000);
    
    const poll = async () => {
      try {
        if (!isPolling || isManualOffline) return;
        
        const businessSetup = usePosStore.getState().businessSetup;
        const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId || (businessSetup as any)?.id;
        if (!businessId) return;

        const cloudUrl = (businessSetup?.apiUrl || businessSetup?.backOfficeUrl || import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app').replace(/\\/$/, '');
        const res = await fetch(\`\${cloudUrl}/api/mpesa/payments/search?businessId=\${businessId}\`);
        if (res.ok) {
          const txns = await res.json();
          const localUsedCodes = usePosStore.getState().transactions.map(t => t.mpesaCode).filter(Boolean);
          
          // Find a transaction that arrived AFTER the modal was opened, matches amount, and NOT used
          const matchingTxn = txns.find((t: any) => {
            const txnTime = new Date(t.timestamp).getTime();
            return txnTime >= componentMountTime && t.amount === totalAmount && !localUsedCodes.includes(t.transactionId);
          });
          
          if (matchingTxn) {
            let fallbackName = 'Customer';
            const state = usePosStore.getState();
            if (matchingTxn.phoneNumber) {
               // Try to match last 9 digits in case of prefix differences (e.g. 2547... vs 07...)
               const phoneSuffix = matchingTxn.phoneNumber.slice(-9);
               const cCust = state.creditCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
               const lCust = state.loyaltyCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
               if (cCust) fallbackName = cCust.name;
               else if (lCust) fallbackName = lCust.name;
            }

            setDetectedPayment({
              transactionId: matchingTxn.transactionId,
              amount: matchingTxn.amount,
              phoneNumber: matchingTxn.phoneNumber,
              customerName: matchingTxn.customerName || fallbackName,
              timestamp: matchingTxn.timestamp
            });
            setIsPolling(false);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
      
      if (isPolling && !isManualOffline) {
        timeout = setTimeout(poll, 5000);
      }
    };
    
    poll();
    
    return () => clearTimeout(timeout);`;

const newPollLogic = `    // Look for payments arriving up to 30 mins early or while modal is open
    const componentMountTime = new Date().getTime() - (30 * 60 * 1000);

    const onPaymentDetected = (matchingTxn: any) => {
      let fallbackName = 'Customer';
      const state = usePosStore.getState();
      if (matchingTxn.phoneNumber) {
         const phoneSuffix = String(matchingTxn.phoneNumber).slice(-9);
         const cCust = state.creditCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
         const lCust = state.loyaltyCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
         if (cCust) fallbackName = cCust.name;
         else if (lCust) fallbackName = lCust.name;
      }

      setDetectedPayment({
        transactionId: matchingTxn.transactionId,
        amount: Number(matchingTxn.amount),
        phoneNumber: matchingTxn.phoneNumber,
        customerName: matchingTxn.customerName || fallbackName,
        timestamp: matchingTxn.timestamp || new Date().toISOString()
      });
      setIsPolling(false);
    };

    // Real-time socket event listener
    const handleMpesaSocketEvent = (e: any) => {
      const data = e.detail;
      if (!data || !data.transactionId) return;
      const amt = Number(data.amount);
      const localUsedCodes = usePosStore.getState().transactions.map(t => t.mpesaCode).filter(Boolean);
      if (Math.abs(amt - Number(totalAmount)) < 0.01 && !localUsedCodes.includes(data.transactionId)) {
        onPaymentDetected(data);
      }
    };
    window.addEventListener('mpesa_payment_received', handleMpesaSocketEvent);

    const poll = async () => {
      try {
        if (!isPolling || isManualOffline) return;
        
        const businessSetup = usePosStore.getState().businessSetup;
        const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId || (businessSetup as any)?.id;
        if (!businessId) return;

        const rawUrl = businessSetup?.apiUrl || businessSetup?.backOfficeUrl || import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';
        const cloudUrl = rawUrl.replace(/\\/$/, '').replace(/\\/api$/, '');
        const res = await fetch(\`\${cloudUrl}/api/mpesa/payments/search?businessId=\${businessId}\`);
        if (res.ok) {
          const txns = await res.json();
          const localUsedCodes = usePosStore.getState().transactions.map(t => t.mpesaCode).filter(Boolean);
          
          // Match any unconsumed transaction with amount equal to total
          const matchingTxn = Array.isArray(txns) ? txns.find((t: any) => {
            const txnTime = new Date(t.timestamp).getTime();
            const amtMatches = Math.abs(Number(t.amount) - Number(totalAmount)) < 0.01;
            const notUsed = !localUsedCodes.includes(t.transactionId);
            return txnTime >= componentMountTime && amtMatches && notUsed;
          }) : null;
          
          if (matchingTxn) {
            onPaymentDetected(matchingTxn);
            return;
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
      
      if (isPolling && !isManualOffline) {
        timeout = setTimeout(poll, 4000);
      }
    };
    
    poll();
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mpesa_payment_received', handleMpesaSocketEvent);
    };`;

tillContent = replaceFlexible(tillContent, oldPollLogic, newPollLogic);
fs.writeFileSync(tillFile, tillContent, 'utf8');
console.log('Successfully updated src/components/Checkout/MpesaPayment/TillMonitor.tsx');
