import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePosStore } from '../../../store/posStore';
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, WifiOff, FileEdit, Users, Edit3, Check, Search, X, ArrowRight, ShieldCheck, Clock, Split, PlusCircle } from 'lucide-react';
import { useToast } from '../../ui/use-toast';

interface Props {
  totalAmount: number;
  remainingAmount?: number;
  onAddSplit?: (tender: { method: 'mpesa'; amount: number; mpesaCode: string; customerName: string; phoneNumber: string }) => void;
  isSplitActive?: boolean;
}

export function formatMaskedPhone(phone: any): string {
  if (!phone) return '07** *** ***';
  const clean = String(phone).trim();
  // Safaricom SHA256 Till hash (64 hex characters) or long hash
  if (clean.length >= 25 || /^[a-f0-9]{20,}$/i.test(clean)) {
    return '07** *** ***';
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('254')) {
    return '0' + digits.slice(3, 6) + ' xxx ' + digits.slice(-3);
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.slice(0, 4) + ' xxx ' + digits.slice(-3);
  }
  if (digits.length === 9) {
    return '0' + digits.slice(0, 3) + ' xxx ' + digits.slice(-3);
  }
  if (clean.includes('*')) {
    return clean.replace(/\*+/g, 'xxx');
  }
  if (digits.length >= 7 && digits.length <= 13) {
    return digits.slice(0, 4) + ' xxx ' + digits.slice(-3);
  }
  return '07** *** ***';
}

export function formatMpesaDisplayTime(timestamp: any): string {
  if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TillMonitor({ totalAmount, remainingAmount, onAddSplit, isSplitActive = false }: Props) {
  const effectiveTargetAmount = (remainingAmount !== undefined && remainingAmount >= 0) ? remainingAmount : totalAmount;

  const [isPolling, setIsPolling] = useState(true);
  const [detectedPayment, setDetectedPayment] = useState<any>(null);
  const [candidatePayments, setCandidatePayments] = useState<any[]>([]);
  const [recentTillPayments, setRecentTillPayments] = useState<any[]>([]);
  const [isManualOffline, setIsManualOffline] = useState(false);
  const [offlinePhone, setOfflinePhone] = useState('');
  const [offlineCode, setOfflineCode] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [customCustomerName, setCustomCustomerName] = useState('');
  
  // Real-time search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Admin PIN Authorization modal for Reusing claimed code
  const [reusePendingPayment, setReusePendingPayment] = useState<any>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  const { completeTransaction } = usePosStore();
  const { toast } = useToast();

  const formatCustomerDisplayName = (rawName?: string | null): string => {
    if (!rawName) return '';
    let cleaned = String(rawName).trim();
    cleaned = cleaned.replace(/^[\d+*\s-]+/, '').trim();
    cleaned = cleaned.replace(/[*#_]/g, ' ').replace(/\s+/g, ' ').trim();

    const lower = cleaned.toLowerCase();
    if (!cleaned || lower === 'mpesa customer' || lower === 'm-pesa customer' || lower === 'customer' || lower === 'unknown') {
      return '';
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';

    const titleWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    if (titleWords.length >= 3) {
      return `${titleWords[0]} ${titleWords[titleWords.length - 1]}`;
    }
    return titleWords.join(' ');
  };

  const enrichCustomerName = (matchingTxn: any) => {
    let resolvedName = matchingTxn?.customerName || '';
    const cleanCurrent = formatCustomerDisplayName(resolvedName);
    if (cleanCurrent) {
      return cleanCurrent;
    }

    const state = usePosStore.getState();
    const rawPhone = matchingTxn?.phoneNumber || '';
    if (rawPhone) {
      const phoneDigits = String(rawPhone).replace(/\D/g, '');
      const phoneSuffix = phoneDigits.slice(-9);

      if (phoneSuffix) {
        // 1. General customers list
        const gCust = (state as any).customers?.find((c: any) => {
          const cp = c?.phone ? String(c.phone).replace(/\D/g, '') : '';
          return cp.endsWith(phoneSuffix);
        });
        if (gCust?.name) resolvedName = gCust.name;

        // 2. Credit customers
        if (!resolvedName) {
          const cCust = state.creditCustomers?.find(c => {
            const cp = c?.phone ? String(c.phone).replace(/\D/g, '') : '';
            return cp.endsWith(phoneSuffix);
          });
          if (cCust?.name) resolvedName = cCust.name;
        }

        // 3. Loyalty customers
        if (!resolvedName) {
          const lCust = state.loyaltyCustomers?.find(c => {
            const cp = c?.phone ? String(c.phone).replace(/\D/g, '') : '';
            return cp.endsWith(phoneSuffix);
          });
          if (lCust?.name) resolvedName = lCust.name;
        }

        // 4. Past transactions in posStore
        if (!resolvedName) {
          const pastTx = (state.transactions || []).find((t: any) => {
            const p = t?.customerPhone || t?.phoneNumber || t?.phone;
            const tp = p ? String(p).replace(/\D/g, '') : '';
            return tp.endsWith(phoneSuffix) && t.customerName && t.customerName !== 'M-Pesa Customer' && t.customerName !== 'Customer';
          });
          if (pastTx && (pastTx as any).customerName) resolvedName = (pastTx as any).customerName;
        }

        // 5. Local phone directory
        if (!resolvedName) {
          try {
            const dir = JSON.parse(localStorage.getItem('pos_customer_phone_directory') || '{}');
            if (dir[phoneSuffix]) resolvedName = dir[phoneSuffix];
          } catch (e) {}
        }
      }
    }

    const formatted = formatCustomerDisplayName(resolvedName);
    return formatted || 'M-Pesa Customer';
  };

  const onPaymentDetected = (matchingTxn: any) => {
    const finalName = enrichCustomerName(matchingTxn);
    setDetectedPayment({
      transactionId: matchingTxn.transactionId,
      amount: Number(matchingTxn.amount),
      phoneNumber: matchingTxn.phoneNumber,
      customerName: finalName,
      timestamp: matchingTxn.timestamp || matchingTxn.createdAt || new Date().toISOString()
    });
    setCustomCustomerName(finalName);
    setIsPolling(false);
  };

  const selectCandidate = (cand: any) => {
    const isClaimed = !!cand.isAlreadyClaimed || cand.status === 'LINKED';
    if (isClaimed) {
      setReusePendingPayment(cand);
      setAdminPinInput('');
      setAdminPinError(null);
      return;
    }

    const finalName = enrichCustomerName(cand);
    setDetectedPayment({
      transactionId: cand.transactionId,
      amount: Number(cand.amount),
      phoneNumber: cand.phoneNumber,
      customerName: finalName,
      timestamp: cand.timestamp || cand.createdAt || new Date().toISOString()
    });
    setCustomCustomerName(finalName);
    setIsPolling(false);
  };

  // Safe diff check to eliminate re-rendering when fetched payments are unchanged
  const arePaymentsEqual = (oldList: any[], newList: any[]) => {
    if (oldList.length !== newList.length) return false;
    for (let i = 0; i < oldList.length; i++) {
      if (oldList[i].transactionId !== newList[i].transactionId ||
          Number(oldList[i].amount) !== Number(newList[i].amount) ||
          oldList[i].customerName !== newList[i].customerName ||
          oldList[i].status !== newList[i].status) {
        return false;
      }
    }
    return true;
  };

  // Fetch recent payments and auto-detect
  const fetchPayments = async (queryText = '') => {
    try {
      const businessSetup = usePosStore.getState().businessSetup;
      const businessId = businessSetup?.cloudBusinessId || businessSetup?.businessId || (businessSetup as any)?.id;
      if (!businessId) return;

      const tillNumber = (businessSetup as any)?.mpesaTillNumber || (businessSetup as any)?.tillNumber || '3098707';
      const shortcode = (businessSetup as any)?.mpesaPaybillNumber || (businessSetup as any)?.mpesaPaybill || (businessSetup as any)?.mpesaShortcode || (businessSetup as any)?.shortcode || '7128505';
      const webportalBase = (businessSetup?.backOfficeUrl || (businessSetup as any)?.cloudUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
      const localServerBase = (businessSetup?.apiUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');

      const isLocal = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        !window.location.hostname
      );

      const queryParam = queryText.trim() ? `&q=${encodeURIComponent(queryText.trim())}` : '';
      const params = `businessId=${encodeURIComponent(businessId)}${queryParam}&tillNumber=${encodeURIComponent(tillNumber)}&shortcode=${encodeURIComponent(shortcode)}`;
      
      const candidateUrls = [
        isLocal ? `http://localhost:3000/api/mpesa/payments/search?${params}` : null,
        `${webportalBase}/api/mpesa/payments/search?${params}`,
        localServerBase ? `${localServerBase}/api/mpesa/payments/search?${params}` : null,
        !isLocal ? `http://localhost:3000/api/mpesa/payments/search?${params}` : null
      ].filter(Boolean) as string[];

      let foundTxns: any[] = [];
      let fetchSuccessful = false;

      for (const url of candidateUrls) {
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
          if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data)) {
              fetchSuccessful = true;
              if (data.length > 0) {
                foundTxns = data;
                break; // Found actual transactions! Stop querying fallback URLs
              }
            }
          }
        } catch (e) {}
      }

      if (fetchSuccessful) {
        const txns = foundTxns;
        const localUsedCodes = usePosStore.getState().transactions.map((t: any) => (t as any).mpesaCode).filter(Boolean);
        let locallyClaimedList: string[] = [];
        try {
          locallyClaimedList = JSON.parse(localStorage.getItem('pos_claimed_mpesa_codes') || '[]');
        } catch (e) {}

        const isClaimedCode = (id: string) => locallyClaimedList.includes(id) || localUsedCodes.includes(id);

        if (Array.isArray(txns)) {
          // If this was an explicit search query
          if (queryText.trim()) {
            setSearchResults(txns);
            if (txns.length === 0) {
              setSearchFeedback(`No payment found matching "${queryText.trim()}". Enter last 3 code chars or phone number.`);
            } else {
              setSearchFeedback(null);
            }
            return;
          }

          // Unlinked recent unclaimed payments only
          const unlinkedOnly = txns.filter((t: any) => !isClaimedCode(t.transactionId) && t.status !== 'LINKED');
          
          setRecentTillPayments(prev => {
            if (arePaymentsEqual(prev, unlinkedOnly)) {
              return prev; // Preserve identity to prevent jitter & unnecessary UI updates
            }
            return unlinkedOnly;
          });

          // Check if an unclaimed payment exactly matches the target bill amount
          const matches = unlinkedOnly.filter((t: any) => Math.abs(Number(t.amount) - Number(effectiveTargetAmount)) < 0.01);
          if (matches.length > 0) {
            setCandidatePayments(matches);
            if (!detectedPayment && matches.length === 1 && effectiveTargetAmount > 0) {
              onPaymentDetected(matches[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error('[TillMonitor] Search/poll error:', err);
    }
  };

  // Real-time Socket.IO listeners (Instant push without waiting for poll interval)
  useEffect(() => {
    const handleMpesaReceived = (e: any) => {
      const data = e.detail;
      if (!data || !data.transactionId) return;
      const amt = Number(data.amount);
      const localUsedCodes = usePosStore.getState().transactions.map((t: any) => (t as any).mpesaCode).filter(Boolean);
      let locallyClaimedList: string[] = [];
      try {
        locallyClaimedList = JSON.parse(localStorage.getItem('pos_claimed_mpesa_codes') || '[]');
      } catch (err) {}

      if (locallyClaimedList.includes(data.transactionId) || localUsedCodes.includes(data.transactionId)) return;

      // Add to recent payments immediately
      setRecentTillPayments(prev => {
        const existingIdx = prev.findIndex(p => p.transactionId === data.transactionId);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = { ...copy[existingIdx], ...data };
          return copy;
        }
        return [data, ...prev];
      });

      // If exact amount match for target amount, auto-detect
      if (Math.abs(amt - Number(effectiveTargetAmount)) < 0.01 && effectiveTargetAmount > 0) {
        onPaymentDetected(data);
      }
    };

    const handleMpesaEnriched = (e: any) => {
      const data = e.detail;
      if (!data || !data.transactionId) return;

      setRecentTillPayments(prev => {
        return prev.map(p => {
          if (p.transactionId === data.transactionId) {
            return {
              ...p,
              customerName: data.customerName || p.customerName,
              phoneNumber: data.phoneNumber || p.phoneNumber,
              isEnriched: true
            };
          }
          return p;
        });
      });

      if (detectedPayment && detectedPayment.transactionId === data.transactionId) {
        setDetectedPayment((prev: any) => ({
          ...prev,
          customerName: data.customerName || prev.customerName,
          phoneNumber: data.phoneNumber || prev.phoneNumber
        }));
        if (data.customerName) {
          setCustomCustomerName(data.customerName);
        }
      }
    };

    const handleMpesaClaimed = (e: any) => {
      const data = e.detail;
      if (!data || !data.transactionId) return;

      setRecentTillPayments(prev => prev.filter(p => p.transactionId !== data.transactionId));
      if (detectedPayment && detectedPayment.transactionId === data.transactionId && !data.reused) {
        setDetectedPayment(null);
        setIsPolling(true);
      }
    };

    window.addEventListener('mpesa_payment_received', handleMpesaReceived);
    window.addEventListener('mpesa_payment_enriched', handleMpesaEnriched);
    window.addEventListener('mpesa_payment_claimed', handleMpesaClaimed);
    return () => {
      window.removeEventListener('mpesa_payment_received', handleMpesaReceived);
      window.removeEventListener('mpesa_payment_enriched', handleMpesaEnriched);
      window.removeEventListener('mpesa_payment_claimed', handleMpesaClaimed);
    };
  }, [effectiveTargetAmount, detectedPayment]);

  // Periodic silent polling in background (without UI flicker)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const poll = async () => {
      if (!isPolling || isManualOffline || detectedPayment) return;
      await fetchPayments();
      if (isPolling && !isManualOffline && !detectedPayment) {
        timeout = setTimeout(poll, 1500);
      }
    };

    poll();
    return () => clearTimeout(timeout);
  }, [isPolling, isManualOffline, detectedPayment, effectiveTargetAmount]);

  // Search input debouncer
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSearchFeedback(null);

    if (!val.trim()) {
      setSearchResults(null);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      await fetchPayments(val);
      setIsSearching(false);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchFeedback(null);
    fetchPayments();
  };

  const handleConfirm = async () => {
    if (!detectedPayment) return;
    
    // Check if amount matches the effective target amount
    const amt = Number(detectedPayment.amount);
    const isExactMatch = Math.abs(amt - effectiveTargetAmount) < 0.01;

    // If split payment is active or onAddSplit handler is present
    if (onAddSplit && (isSplitActive || !isExactMatch)) {
      onAddSplit({
        method: 'mpesa',
        amount: amt,
        mpesaCode: detectedPayment.transactionId,
        customerName: customCustomerName.trim() || detectedPayment.customerName || 'M-Pesa Customer',
        phoneNumber: detectedPayment.phoneNumber || ''
      });
      setDetectedPayment(null);
      setIsPolling(true);
      return;
    }

    if (!isExactMatch) {
      toast('Transaction amount does not match required total. You can use it as a partial split payment below.', 'error');
      return;
    }

    const rawName = customCustomerName.trim() || detectedPayment.customerName || '';
    const finalCustomerName = formatCustomerDisplayName(rawName) || rawName || 'M-Pesa Customer';
    
    // Save to phone directory so future transactions remember this customer automatically
    if (finalCustomerName && finalCustomerName !== 'M-Pesa Customer' && detectedPayment.phoneNumber) {
      const phoneDigits = String(detectedPayment.phoneNumber).replace(/\D/g, '');
      const phoneSuffix = phoneDigits.slice(-9);
      if (phoneSuffix) {
        try {
          const dir = JSON.parse(localStorage.getItem('pos_customer_phone_directory') || '{}');
          dir[phoneSuffix] = finalCustomerName;
          localStorage.setItem('pos_customer_phone_directory', JSON.stringify(dir));
        } catch (e) {}
      }
    }

    try {
      const businessSetup = usePosStore.getState().businessSetup;
      const businessId = businessSetup?.cloudBusinessId || businessSetup?.businessId || (businessSetup as any)?.id;
      const webportalBase = (businessSetup?.backOfficeUrl || businessSetup?.cloudUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
      const consumeUrl = businessSetup?.mpesaConsumeUrl || `${webportalBase}/api/mpesa/payments/consume`;

      try {
        await fetch(consumeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: detectedPayment.transactionId, businessId }),
          signal: AbortSignal.timeout(3000)
        });
      } catch (cloudErr) {
        const localServerBase = (businessSetup?.apiUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');
        if (localServerBase) {
          try {
            await fetch(`${localServerBase}/api/mpesa/payments/consume`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactionId: detectedPayment.transactionId, businessId }),
              signal: AbortSignal.timeout(1500)
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('[TillMonitor] Payment consume note:', err);
    }
    
    // Complete single transaction atomically
    completeTransaction('mpesa', undefined, { 
      mpesaCode: detectedPayment.transactionId,
      phoneNumber: detectedPayment.phoneNumber,
      customerName: finalCustomerName,
      mpesaName: finalCustomerName,
      amountTendered: detectedPayment.amount
    });
  };

  const handleAddCandidateToSplit = (cand: any) => {
    if (!onAddSplit) {
      toast('Split payments mode ready. Added to split bill.', 'info');
      return;
    }
    const finalName = enrichCustomerName(cand);
    onAddSplit({
      method: 'mpesa',
      amount: Number(cand.amount),
      mpesaCode: cand.transactionId,
      customerName: finalName,
      phoneNumber: cand.phoneNumber || ''
    });
    setDetectedPayment(null);
  };

  const handleAuthorizeReuse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reusePendingPayment) return;
    const cleanPin = adminPinInput.trim();
    if (!cleanPin) {
      setAdminPinError('Please enter Manager/Admin PIN');
      return;
    }

    setIsVerifyingAdmin(true);
    setAdminPinError(null);

    try {
      const state = usePosStore.getState();
      const matchedAdmin = (state.users || []).find(
        (u: any) => String(u.pin) === cleanPin && ['admin', 'manager', 'ADMIN', 'MANAGER'].includes(u.role)
      );

      if (!matchedAdmin) {
        setAdminPinError('Invalid Manager/Admin PIN. Re-use authorization denied.');
        setIsVerifyingAdmin(false);
        return;
      }

      // Call consume endpoint with adminPin
      const businessSetup = state.businessSetup;
      const businessId = businessSetup?.cloudBusinessId || businessSetup?.businessId || (businessSetup as any)?.id;
      const webportalBase = (businessSetup?.backOfficeUrl || (businessSetup as any)?.cloudUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
      const localServerBase = (businessSetup?.apiUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');

      const payload = JSON.stringify({
        transactionId: reusePendingPayment.transactionId,
        businessId,
        adminPin: cleanPin,
        cashier: state.currentCashier?.name || 'Cashier'
      });

      const urls = [
        `${webportalBase}/api/mpesa/payments/consume`,
        localServerBase ? `${localServerBase}/api/mpesa/payments/consume` : null,
        'http://localhost:3000/api/mpesa/payments/consume'
      ].filter(Boolean) as string[];

      for (const url of urls) {
        try {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            signal: AbortSignal.timeout(3000)
          });
        } catch (err) {}
      }

      toast(`Payment reuse authorized by Admin (${matchedAdmin.name}).`, 'success');

      // Select with asterisk prefix for audit
      const finalName = enrichCustomerName(reusePendingPayment);
      setDetectedPayment({
        transactionId: `*${reusePendingPayment.transactionId}`,
        amount: Number(reusePendingPayment.amount),
        phoneNumber: reusePendingPayment.phoneNumber,
        customerName: finalName,
        timestamp: new Date().toISOString(),
        isReused: true,
        reusedApprovedBy: matchedAdmin.name
      });
      setCustomCustomerName(finalName);
      setReusePendingPayment(null);
      setIsPolling(false);
    } catch (err: any) {
      setAdminPinError(err.message || 'Authorization failed');
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleOfflineConfirm = () => {
    if (offlinePhone.length !== 3 || offlineCode.length !== 3) {
      toast('Please enter exactly 3 digits/characters for both fields.', 'error');
      return;
    }

    completeTransaction('mpesa', undefined, {
      mpesaCode: `***${offlineCode.toUpperCase()}`,
      phoneNumber: `***${offlinePhone}`,
      amountTendered: totalAmount
    });
  };

  // Render Manual Offline Fallback Form
  if (isManualOffline) {
    const isValid = offlinePhone.length === 3 && offlineCode.length === 3;
    return (
      <div className="flex flex-col h-full bg-orange-50/60 p-4 rounded-xl border border-orange-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Manual Offline Reconciliation</h3>
            <p className="text-xs text-gray-500">Record customer code suffix when server/internet is unreachable</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
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
              className="w-full text-center text-xl font-mono tracking-[0.5em] p-2.5 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all bg-white font-bold"
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
              className="w-full text-center text-xl font-mono tracking-[0.5em] p-2.5 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all uppercase bg-white font-bold"
            />
          </div>
        </div>

        <button 
          onClick={handleOfflineConfirm}
          disabled={!isValid}
          className="mt-auto w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-200 text-sm"
        >
          <FileEdit className="w-4 h-4" />
          RECORD OFFLINE SALE
        </button>
        <button 
          onClick={() => setIsManualOffline(false)}
          className="mt-2 w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          ← Cancel & Return to Live Till Monitor
        </button>
      </div>
    );
  }

  // Render Detected Payment Confirmation Card
  if (detectedPayment) {
    const amt = Number(detectedPayment.amount);
    const isAmountMatch = Math.abs(amt - effectiveTargetAmount) < 0.01;
    const isPartial = amt < effectiveTargetAmount;
    
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                PAYMENT DETECTED
              </h3>
              <p className="text-[11px] text-gray-500">Verified from M-Pesa Till callback</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { setDetectedPayment(null); setIsPolling(true); }}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            ← View All Payments
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-3 mb-3 shadow-xs">
          <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Customer Name</p>
              <button 
                type="button" 
                onClick={() => setIsEditingName(!isEditingName)} 
                className="text-[11px] text-emerald-700 flex items-center gap-1 font-bold hover:underline"
              >
                <Edit3 className="w-3 h-3" /> {isEditingName ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {isEditingName ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input 
                  type="text" 
                  value={customCustomerName} 
                  onChange={e => setCustomCustomerName(e.target.value)}
                  placeholder="Enter customer name..."
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-emerald-300 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  type="button" 
                  onClick={() => setIsEditingName(false)}
                  className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-base font-black text-gray-900 mt-0.5">
                {customCustomerName || detectedPayment.customerName || 'M-Pesa Customer'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Customer Phone</p>
              <p className="font-mono font-bold text-gray-900 truncate" title={formatMaskedPhone(detectedPayment.phoneNumber)}>
                {formatMaskedPhone(detectedPayment.phoneNumber)}
              </p>
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">M-Pesa Receipt Code</p>
              <p className="font-mono font-black text-gray-900 tracking-wide truncate">{detectedPayment.transactionId}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Time Received</p>
              <p className="font-medium text-gray-700">{formatMpesaDisplayTime(detectedPayment.timestamp)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Verification</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Safaricom Verified
              </span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg flex items-center justify-between border ${isAmountMatch ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div>
              <p className="text-[10px] font-semibold uppercase mb-0.5">Amount Paid</p>
              <p className={`text-lg font-black font-mono ${isAmountMatch ? 'text-emerald-700' : 'text-amber-800'}`}>
                KSh {Number(detectedPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            {!isAmountMatch && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full block mb-0.5">
                  Target: KSh {effectiveTargetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-amber-700 font-semibold">
                  {isPartial ? `Needs KSh ${(effectiveTargetAmount - amt).toFixed(2)} more` : `Difference: KSh ${(amt - effectiveTargetAmount).toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {isAmountMatch ? (
          <button 
            onClick={handleConfirm}
            className="mt-auto w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200 text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {onAddSplit && isSplitActive ? 'CONFIRM & ADD TO SPLIT BILL' : 'CONFIRM & COMPLETE SALE'}
          </button>
        ) : (
          <div className="mt-auto space-y-2">
            {onAddSplit && (
              <button 
                onClick={() => handleAddCandidateToSplit(detectedPayment)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-sm"
              >
                <Split className="w-4 h-4" />
                ADD KSh {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} TO SPLIT BILL
              </button>
            )}
            <button 
              type="button"
              onClick={() => { setDetectedPayment(null); setIsPolling(true); }}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 font-semibold text-center"
            >
              Cancel & Pick Another Payment
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active view: Group payments by Exact Match vs Other Amounts
  const rawList = searchResults !== null ? searchResults : recentTillPayments;
  
  // Categorize
  const exactMatches = rawList.filter((c: any) => Math.abs(Number(c.amount) - effectiveTargetAmount) < 0.01 && c.status !== 'LINKED');
  const otherPayments = rawList.filter((c: any) => Math.abs(Number(c.amount) - effectiveTargetAmount) >= 0.01 || c.status === 'LINKED');

  return (
    <div className="flex flex-col h-full">
      
      {/* 1. Universal Search Bar (Code prefix/suffix, Phone digits, or Name) */}
      <div className="relative mb-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search code (e.g. SK9...), phone (e.g. 712...), or name..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs font-medium"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={handleClearSearch}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Status Banner / Searching Feedback */}
      {isSearching ? (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          Searching database...
        </div>
      ) : searchFeedback ? (
        <div className="p-2 mb-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span>{searchFeedback}</span>
          <button onClick={handleClearSearch} className="text-amber-900 font-bold underline ml-2">Clear</button>
        </div>
      ) : null}

      {/* 3. List of Payments (Searched or Live Unclaimed) */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-0.5 min-h-[110px]">
        {rawList.length > 0 ? (
          <div className="space-y-3">
            
            {/* Top Section: EXACT MATCHES FOR CURRENT AMOUNT */}
            {exactMatches.length > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-2.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
                    🎯 MATCHING SALE AMOUNT (KSh {effectiveTargetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                    {exactMatches.length} Found
                  </span>
                </div>

                <div className="space-y-1.5">
                  {exactMatches.map((cand, idx) => (
                    <div 
                      key={cand.transactionId || idx}
                      onClick={() => selectCandidate(cand)}
                      className="p-2.5 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-50/80 cursor-pointer shadow-xs transition-all flex items-center justify-between ring-1 ring-emerald-400/50"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-gray-900 text-xs truncate">
                            {cand.customerName || 'M-Pesa Customer'}
                          </p>
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">
                            Ready to Confirm
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5 font-mono">
                          <span className="font-bold text-gray-700">{formatMaskedPhone(cand.phoneNumber)}</span>
                          <span>•</span>
                          <span className="font-black text-emerald-800">{cand.transactionId}</span>
                          <span>•</span>
                          <span className="text-gray-400">{formatMpesaDisplayTime(cand.timestamp || cand.createdAt)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className="text-sm font-black font-mono text-emerald-700">
                          KSh {Number(cand.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          type="button"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm"
                        >
                          SELECT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Section: OTHER RECENT TILL PAYMENTS (Including partial candidates for split) */}
            {otherPayments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {exactMatches.length > 0 ? `Other Recent Till Payments (${otherPayments.length})` : `Recent Till Payments (${otherPayments.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchPayments(searchQuery)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="space-y-1.5">
                  {otherPayments.map((cand, idx) => {
                    const amt = Number(cand.amount);
                    const isClaimed = !!cand.isAlreadyClaimed || cand.status === 'LINKED';
                    const canBePartialSplit = !isClaimed && onAddSplit && amt < effectiveTargetAmount;

                    return (
                      <div 
                        key={cand.transactionId || idx}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between shadow-2xs ${
                          isClaimed 
                            ? 'bg-amber-50/40 border-amber-200' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div 
                          className="min-w-0 flex-1 pr-2 cursor-pointer"
                          onClick={() => selectCandidate(cand)}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {cand.customerName || 'M-Pesa Customer'}
                            </p>
                            {isClaimed && (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5" /> Claimed (PIN to Reuse)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5 font-mono">
                            <span className="font-bold text-gray-700">{formatMaskedPhone(cand.phoneNumber)}</span>
                            <span>•</span>
                            <span className="font-black text-gray-900">{cand.transactionId}</span>
                            <span>•</span>
                            <span className="text-gray-400">{formatMpesaDisplayTime(cand.timestamp || cand.createdAt)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span className="text-xs font-black font-mono text-gray-900">
                            KSh {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          {isClaimed ? (
                            <button
                              type="button"
                              onClick={() => { setReusePendingPayment(cand); setAdminPinInput(''); setAdminPinError(null); }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-2xs flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" /> REUSE (PIN)
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {canBePartialSplit && (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleAddCandidateToSplit(cand); }}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-2xs flex items-center gap-1"
                                  title="Add to split payment bill"
                                >
                                  <PlusCircle className="w-3 h-3" /> SPLIT
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={() => selectCandidate(cand)}
                                className="px-2.5 py-1 bg-gray-700 hover:bg-gray-900 text-white font-bold text-[10px] rounded-lg shadow-2xs"
                              >
                                SELECT
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center px-4 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <p className="text-xs font-bold text-gray-800">Listening for incoming Till payments...</p>
            <p className="text-[11px] text-gray-500 max-w-[260px] mt-0.5">
              Customer can scan QR code above or send money to Till. Matching amount of KSh {effectiveTargetAmount.toFixed(2)} will pop up here instantly.
            </p>
          </div>
        )}
      </div>

      {/* 4. Footer controls & Offline entry option */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Live Hook Active (Instant Stream)</span>
        </div>
        <button 
          onClick={() => setIsManualOffline(true)}
          className="text-[11px] text-orange-600 hover:text-orange-800 font-semibold underline underline-offset-2 flex items-center gap-1"
        >
          <WifiOff className="w-3 h-3" /> System Offline? Enter Manually
        </button>
      </div>

      {/* 5. Manager / Admin PIN Authorization Modal for Code Reuse */}
      {reusePendingPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Manager / Admin PIN Required</h3>
                <p className="text-xs text-gray-500">Authorize payment reuse</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-900 border border-amber-200/80">
              <p className="font-bold">Transaction: {reusePendingPayment.transactionId}</p>
              <p>Amount: KSh {Number(reusePendingPayment.amount).toFixed(2)}</p>
              <p className="text-[11px] text-amber-700 mt-1">
                This transaction has already been linked to a previous sale. To reuse it, enter a Manager or Admin PIN. The reuse will be logged for audit.
              </p>
            </div>

            <form onSubmit={handleAuthorizeReuse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Manager / Admin PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminPinInput}
                  onChange={(e) => { setAdminPinInput(e.target.value.replace(/\D/g, '')); setAdminPinError(null); }}
                  placeholder="Enter 4-digit PIN"
                  autoFocus
                  className="w-full text-center text-xl font-mono tracking-[0.5em] p-2.5 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all font-bold"
                />
                {adminPinError && (
                  <p className="text-xs text-red-600 font-semibold mt-1 text-center">{adminPinError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setReusePendingPayment(null); setAdminPinInput(''); setAdminPinError(null); }}
                  className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingAdmin || !adminPinInput.trim()}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isVerifyingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}