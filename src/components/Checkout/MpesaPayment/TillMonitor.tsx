import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../../store/posStore';
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, WifiOff, FileEdit } from 'lucide-react';
import { useToast } from '../../ui/use-toast';

interface Props {
  totalAmount: number;
}

export default function TillMonitor({ totalAmount }: Props) {
  const [isPolling, setIsPolling] = useState(true);
  const [detectedPayment, setDetectedPayment] = useState<any>(null);
  const [isManualOffline, setIsManualOffline] = useState(false);
  const [offlinePhone, setOfflinePhone] = useState('');
  const [offlineCode, setOfflineCode] = useState('');
  const { completeTransaction } = usePosStore();
  const { toast } = useToast();

  useEffect(() => {
    // Poll the backend every 5 seconds for new M-Pesa transactions
    let timeout: NodeJS.Timeout;
    
    // Track when this component mounted so we only look for RECENT payments (allow up to 2 mins early)
    const componentMountTime = new Date().getTime() - (2 * 60 * 1000);
    
    const poll = async () => {
      try {
        if (!isPolling || isManualOffline) return;
        
        const businessSetup = usePosStore.getState().businessSetup;
        const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;
        if (!businessId) return;

        const rawUrl = (businessSetup as any)?.backOfficeUrl || (businessSetup as any)?.apiUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const baseUrl = rawUrl.replace(/\/$/, '').replace(/\/api$/, '');
        const res = await fetch(`${baseUrl}/api/mpesa/payments/search?businessId=${businessId}`);
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
    
    return () => clearTimeout(timeout);
  }, [isPolling, totalAmount, isManualOffline]);

  const handleConfirm = () => {
    if (!detectedPayment) return;
    
    if (detectedPayment.amount !== totalAmount) {
      toast('The transaction amount does not match the sale total.', 'error');
      return;
    }
    
    // Complete the transaction atomically
    completeTransaction('mpesa', undefined, { 
      mpesaCode: detectedPayment.transactionId,
      phoneNumber: detectedPayment.phoneNumber,
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

  if (detectedPayment) {
    const isAmountMatch = detectedPayment.amount === totalAmount;
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              PAYMENT DETECTED
            </h3>
            <p className="text-sm text-gray-500">Please verify details before completing</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 mb-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Customer Name</p>
              <p className="font-medium text-gray-900">
                {(detectedPayment.customerName && detectedPayment.customerName.trim().split(' ').length < 2 && detectedPayment.customerName !== 'Customer') 
                  ? -name- (M-Pesa).replace('-name-', detectedPayment.customerName)
                  : (detectedPayment.customerName || 'Unknown')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Phone Number</p>
              <p className="font-medium text-gray-900">
                {detectedPayment.phoneNumber?.length > 15 
                  ? 'Hidden (Privacy)' 
                  : detectedPayment.phoneNumber}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Transaction ID</p>
              <p className="font-medium text-gray-900">{detectedPayment.transactionId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase">Time</p>
              <p className="font-medium text-gray-900">{new Date(detectedPayment.timestamp).toLocaleTimeString()}</p>
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
