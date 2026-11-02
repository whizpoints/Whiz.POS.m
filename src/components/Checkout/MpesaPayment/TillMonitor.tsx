import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../../store/posStore';
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, WifiOff, FileEdit, Users, Edit3, Check } from 'lucide-react';
import { useToast } from '../../ui/use-toast';

interface Props {
  totalAmount: number;
}

export default function TillMonitor({ totalAmount }: Props) {
  const [isPolling, setIsPolling] = useState(true);
  const [detectedPayment, setDetectedPayment] = useState<any>(null);
  const [candidatePayments, setCandidatePayments] = useState<any[]>([]);
  const [isManualOffline, setIsManualOffline] = useState(false);
  const [offlinePhone, setOfflinePhone] = useState('');
  const [offlineCode, setOfflineCode] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [customCustomerName, setCustomCustomerName] = useState('');
  const { completeTransaction } = usePosStore();
  const { toast } = useToast();

  useEffect(() => {
    // Poll the backend every 4 seconds for new M-Pesa transactions
    let timeout: NodeJS.Timeout;
    
    // Look for payments arriving up to 30 mins early or while modal is open
    const componentMountTime = new Date().getTime() - (30 * 60 * 1000);

    const enrichCustomerName = (matchingTxn: any) => {
      let resolvedName = matchingTxn.customerName || '';
      if (!resolvedName || resolvedName === 'Customer' || resolvedName === 'Unknown') {
        const state = usePosStore.getState();
        if (matchingTxn.phoneNumber) {
          const phoneSuffix = String(matchingTxn.phoneNumber).slice(-9);
          const cCust = state.creditCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
          const lCust = state.loyaltyCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
          if (cCust) resolvedName = cCust.name;
          else if (lCust) resolvedName = lCust.name;
        }
      }
      return resolvedName || 'M-Pesa Customer';
    };

    const onPaymentDetected = (matchingTxn: any) => {
      const finalName = enrichCustomerName(matchingTxn);
      setDetectedPayment({
        transactionId: matchingTxn.transactionId,
        amount: Number(matchingTxn.amount),
        phoneNumber: matchingTxn.phoneNumber,
        customerName: finalName,
        timestamp: matchingTxn.timestamp || new Date().toISOString()
      });
      setCustomCustomerName(finalName);
      setIsPolling(false);
    };

    // Real-time socket event listener
    const handleMpesaSocketEvent = (e: any) => {
      const data = e.detail;
      if (!data || !data.transactionId) return;
      const amt = Number(data.amount);
      const localUsedCodes = usePosStore.getState().transactions.map((t: any) => t.mpesaCode).filter(Boolean);
      if (Math.abs(amt - Number(totalAmount)) < 0.01 && !localUsedCodes.includes(data.transactionId)) {
        setCandidatePayments(prev => {
          const exists = prev.some(p => p.transactionId === data.transactionId);
          if (!exists) return [data, ...prev];
          return prev;
        });
        if (!detectedPayment) {
          onPaymentDetected(data);
        }
      }
    };
    window.addEventListener('mpesa_payment_received', handleMpesaSocketEvent);

    const poll = async () => {
      try {
        if (!isPolling || isManualOffline) return;
        
        const businessSetup = usePosStore.getState().businessSetup;
        const businessId = businessSetup?.cloudBusinessId || businessSetup?.businessId || (businessSetup as any)?.id;
        if (!businessId) return;

        // Direct Web Portal query for real-time M-Pesa callbacks even when local server is off
        const webportalBase = (businessSetup?.backOfficeUrl || businessSetup?.cloudUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
        const webportalUrl = businessSetup?.mpesaSearchUrl 
          ? (businessSetup.mpesaSearchUrl.includes('?') ? `${businessSetup.mpesaSearchUrl}&businessId=${businessId}` : `${businessSetup.mpesaSearchUrl}?businessId=${businessId}`)
          : `${webportalBase}/api/mpesa/payments/search?businessId=${businessId}`;

        const localServerBase = (businessSetup?.apiUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');
        const localServerUrl = localServerBase ? `${localServerBase}/api/mpesa/payments/search?businessId=${businessId}` : null;

        let res: Response | null = null;
        try {
          res = await fetch(webportalUrl, {
            signal: AbortSignal.timeout(3500)
          });
        } catch (fetchErr) {
          // If webportal is unreachable (e.g. internet down), try local server if configured
          if (localServerUrl) {
            try {
              res = await fetch(localServerUrl, {
                signal: AbortSignal.timeout(2000)
              });
            } catch (localErr) {
              // Both failed, ignore for this poll interval
            }
          }
          // Also trigger server discovery if local server had connection error
          if (window.electron && typeof window.electron.discoverLocalServer === 'function') {
            window.electron.discoverLocalServer().then((discovered: any) => {
              const foundUrl = Array.isArray(discovered) ? discovered[0]?.url : (discovered?.url || (typeof discovered === 'string' ? discovered : null));
              if (foundUrl && foundUrl !== localServerBase) {
                usePosStore.getState().updateServerUrl(foundUrl);
              }
            }).catch(() => {});
          }
        }

        if (res && res.ok) {
          const txns = await res.json();
          const localUsedCodes = usePosStore.getState().transactions.map((t: any) => t.mpesaCode).filter(Boolean);
          
          // Match unconsumed transactions with amount equal to total
          const matches = Array.isArray(txns) ? txns.filter((t: any) => {
            const rawTime = t.timestamp || t.createdAt || Date.now();
            const txnTime = new Date(rawTime).getTime();
            const amtMatches = Math.abs(Number(t.amount) - Number(totalAmount)) < 0.01;
            const notUsed = !localUsedCodes.includes(t.transactionId);
            return txnTime >= (componentMountTime - 60000) && amtMatches && notUsed;
          }) : [];
          
          if (matches.length > 1) {
            setCandidatePayments(matches);
            // If nothing is explicitly picked yet, don't auto-pick arbitrary one, prompt cashier
            if (!detectedPayment) {
              setIsPolling(false);
              return;
            }
          } else if (matches.length === 1) {
            setCandidatePayments(matches);
            if (!detectedPayment) {
              onPaymentDetected(matches[0]);
              return;
            }
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
    };
  }, [isPolling, totalAmount, isManualOffline, detectedPayment]);

  const selectCandidate = (cand: any) => {
    let resolvedName = cand.customerName || '';
    if (!resolvedName || resolvedName === 'Customer' || resolvedName === 'Unknown') {
      const state = usePosStore.getState();
      if (cand.phoneNumber) {
        const phoneSuffix = String(cand.phoneNumber).slice(-9);
        const cCust = state.creditCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
        const lCust = state.loyaltyCustomers?.find(c => c.phone?.endsWith(phoneSuffix));
        if (cCust) resolvedName = cCust.name;
        else if (lCust) resolvedName = lCust.name;
      }
    }
    const finalName = resolvedName || 'M-Pesa Customer';
    setDetectedPayment({
      transactionId: cand.transactionId,
      amount: Number(cand.amount),
      phoneNumber: cand.phoneNumber,
      customerName: finalName,
      timestamp: cand.timestamp || new Date().toISOString()
    });
    setCustomCustomerName(finalName);
    setIsPolling(false);
  };

  const handleConfirm = async () => {
    if (!detectedPayment) return;
    
    if (detectedPayment.amount !== totalAmount) {
      toast('The transaction amount does not match the sale total.', 'error');
      return;
    }

    const finalCustomerName = customCustomerName.trim() || detectedPayment.customerName || 'M-Pesa Customer';

    try {
      // Mark payment as consumed on webportal/server to prevent double-use
      const businessSetup = usePosStore.getState().businessSetup;
      const businessId = businessSetup?.cloudBusinessId || businessSetup?.businessId || (businessSetup as any)?.id;
      const webportalBase = (businessSetup?.backOfficeUrl || businessSetup?.cloudUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
      const consumeUrl = businessSetup?.mpesaConsumeUrl || `${webportalBase}/api/mpesa/payments/consume`;

      try {
        const consumeRes = await fetch(consumeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: detectedPayment.transactionId, businessId }),
          signal: AbortSignal.timeout(4000)
        });

        if (!consumeRes.ok) {
          const err = await consumeRes.json().catch(() => ({}));
          if (consumeRes.status === 409) {
            console.warn('[TillMonitor] Payment was already claimed, proceeding with sale:', detectedPayment.transactionId);
          } else {
            toast(err.error || 'Payment consume verification failed.', 'error');
          }
        }
      } catch (cloudConsumeErr) {
        // Fallback to local server if webportal had a connection issue
        const localServerBase = (businessSetup?.apiUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');
        if (localServerBase) {
          try {
            await fetch(`${localServerBase}/api/mpesa/payments/consume`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactionId: detectedPayment.transactionId, businessId }),
              signal: AbortSignal.timeout(2000)
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[TillMonitor] Failed to consume payment:', err);
    }
    
    // Complete the transaction atomically with customer name recorded
    completeTransaction('mpesa', undefined, { 
      mpesaCode: detectedPayment.transactionId,
      phoneNumber: detectedPayment.phoneNumber,
      customerName: finalCustomerName,
      mpesaName: finalCustomerName,
      amountTendered: detectedPayment.amount
    });
  };

  const handleOfflineConfirm = () => {
    if (offlinePhone.length !== 3 || offlineCode.length !== 3) {
      toast('Please enter exactly 3 digits for both fields.', 'error');
      return;
    }

    completeTransaction('mpesa', undefined, {
      mpesaCode: `***${offlineCode.toUpperCase()}`,
      phoneNumber: `***${offlinePhone}`,
      amountTendered: totalAmount
    });
  };

  if (isManualOffline) {
    const isValid = offlinePhone.length === 3 && offlineCode.length === 3;
    return (
      <div className="flex flex-col h-full bg-orange-50/50 p-4 rounded-xl border border-orange-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Offline Verification</h3>
            <p className="text-xs text-gray-500">Manual entry for offline reconciliation</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Last 3 digits of Customer Phone
            </label>
            <input 
              type="text" 
              maxLength={3}
              value={offlinePhone}
              onChange={(e) => setOfflinePhone(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 456"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] p-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Last 3 chars of M-Pesa Code
            </label>
            <input 
              type="text" 
              maxLength={3}
              value={offlineCode}
              onChange={(e) => setOfflineCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. 9X2"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] p-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all uppercase"
            />
          </div>
        </div>

        <button 
          onClick={handleOfflineConfirm}
          disabled={!isValid}
          className="mt-auto w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
        >
          <FileEdit className="w-5 h-5" />
          RECORD OFFLINE SALE
        </button>
        <button 
          onClick={() => setIsManualOffline(false)}
          className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Cancel & Return to Auto-Detect
        </button>
      </div>
    );
  }

  // If multiple payments match the amount and none selected yet: Cashier picks who is paying!
  if (!detectedPayment && candidatePayments.length > 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Multiple Payments Found ({candidatePayments.length})
            </h3>
            <p className="text-xs text-gray-500">Select the customer standing at your counter:</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {candidatePayments.map((cand, idx) => (
            <div 
              key={idx}
              onClick={() => selectCandidate(cand)}
              className="p-3.5 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50/50 cursor-pointer transition-all flex items-center justify-between shadow-sm bg-white"
            >
              <div>
                <p className="font-bold text-gray-900 text-base flex items-center gap-2">
                  {cand.customerName || 'M-Pesa Customer'}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">{cand.phoneNumber || 'No phone'}</span>
                  <span className="font-mono">{cand.transactionId}</span>
                  <span>{new Date(cand.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
              <button 
                type="button"
                className="px-3 py-1.5 bg-green-600 text-white font-bold text-xs rounded-lg shadow hover:bg-green-700"
              >
                SELECT
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={() => { setCandidatePayments([]); setIsPolling(true); }}
          className="py-2 text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-scan for new payments
        </button>
      </div>
    );
  }

  if (detectedPayment) {
    const isAmountMatch = Math.abs(detectedPayment.amount - totalAmount) < 0.01;
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                PAYMENT DETECTED
              </h3>
              <p className="text-xs text-gray-500">Verify customer details and confirm</p>
            </div>
          </div>
          {candidatePayments.length > 1 && (
            <button 
              type="button"
              onClick={() => setDetectedPayment(null)}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Choose different customer ({candidatePayments.length})
            </button>
          )}
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 mb-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-green-50/70 p-3 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-green-800 uppercase">Customer Name</p>
                <button 
                  type="button" 
                  onClick={() => setIsEditingName(!isEditingName)} 
                  className="text-xs text-green-700 flex items-center gap-1 font-bold hover:underline"
                >
                  <Edit3 className="w-3 h-3" /> {isEditingName ? 'Cancel' : 'Edit Name'}
                </button>
              </div>
              {isEditingName ? (
                <div className="mt-2 flex items-center gap-2">
                  <input 
                    type="text" 
                    value={customCustomerName} 
                    onChange={e => setCustomCustomerName(e.target.value)}
                    placeholder="Enter customer name..."
                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-green-300 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-lg font-black text-gray-900 mt-0.5">
                  {customCustomerName || detectedPayment.customerName || 'M-Pesa Customer'}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Phone Number</p>
              <p className="font-mono font-bold text-gray-900">{detectedPayment.phoneNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Transaction ID</p>
              <p className="font-mono font-bold text-gray-900">{detectedPayment.transactionId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Time</p>
              <p className="font-medium text-gray-700">{new Date(detectedPayment.timestamp).toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Verification Status</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Validated
              </span>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg flex items-center justify-between border ${isAmountMatch ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div>
              <p className="text-xs font-semibold uppercase mb-1">Amount Paid</p>
              <p className={`text-xl font-bold ${isAmountMatch ? 'text-green-700' : 'text-red-700'}`}>
                KSh {detectedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            {!isAmountMatch && (
              <div className="flex items-center gap-2 text-red-600 bg-white px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
                <AlertTriangle className="w-4 h-4" />
                MISMATCH (Expected: {totalAmount.toLocaleString()})
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleConfirm}
          disabled={!isAmountMatch}
          className="mt-auto w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200"
        >
          <CheckCircle2 className="w-5 h-5" />
          CONFIRM & COMPLETE SALE
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-6 relative z-10">
          <Smartphone className="w-8 h-8" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin z-20"></div>
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-2">Waiting for payment...</h3>
      <p className="text-gray-500 text-sm max-w-[250px] mx-auto">
        Listening for incoming transactions on your M-Pesa Till. 
      </p>
      
      <div className="mt-6 flex flex-col gap-3 w-full">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 bg-gray-200/50 px-4 py-2 rounded-full mx-auto">
          <Loader2 className="w-3 h-3 animate-spin" />
          AUTO-DETECT ACTIVE
        </div>

        <button 
          onClick={() => setIsManualOffline(true)}
          className="text-xs text-orange-600 hover:text-orange-800 font-semibold underline underline-offset-2 flex items-center justify-center gap-1 mt-2"
        >
          <WifiOff className="w-3 h-3" /> System Offline? Enter Manually
        </button>
      </div>
    </div>
  );
}

// Temporary inline icon since lucide might not be imported above
const Smartphone = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
);
