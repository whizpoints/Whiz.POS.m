import React, { useState } from 'react';
import { Search, X, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { Modal } from '../../ui/modal';
import { usePosStore } from '../../../store/posStore';

interface MpesaTxn {
  transactionId: string;
  customerName: string | null;
  phoneNumber: string;
  amount: number;
  timestamp: string;
  isEnriched: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetAmount: number;
  /** Called when a transaction is selected and consumed — triggers sale completion */
  onSelect: (txn: MpesaTxn) => void;
}

export default function SearchModal({ isOpen, onClose, targetAmount, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MpesaTxn[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const businessSetup = usePosStore.getState().businessSetup;
      const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;
      
      if (!businessId) {
        setResults([]);
        return;
      }

      const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';
      const res = await fetch(`${cloudUrl}/api/mpesa/payments/search?businessId=${businessId}&q=${encodeURIComponent(query)}`);
      
      if (res.ok) {
        const txns = await res.json();
        // Filter out transactions already used in local session
        const localUsedCodes = usePosStore.getState().transactions.map(t => (t as any).mpesaCode).filter(Boolean);
        const filtered = txns.filter((t: any) => !localUsedCodes.includes(t.transactionId));
        
        setResults(filtered.map((t: any) => ({
          transactionId: t.transactionId,
          customerName: t.customerName || null,
          phoneNumber: t.phoneNumber,
          amount: t.amount,
          timestamp: t.timestamp,
          isEnriched: t.isEnriched
        })));
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Failed to search payments:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (txn: MpesaTxn) => {
    setSelectingId(txn.transactionId);
    try {
      const businessSetup = usePosStore.getState().businessSetup;
      const businessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;
      const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';

      // Mark the payment as consumed on the cloud server (prevents double-use)
      const consumeRes = await fetch(`${cloudUrl}/api/mpesa/payments/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txn.transactionId, businessId })
      });

      if (!consumeRes.ok) {
        const err = await consumeRes.json().catch(() => ({}));
        alert(err.error || 'This payment may already have been claimed. Please check.');
        setSelectingId(null);
        return;
      }

      // Pass back to parent (CheckoutModal) to call completeTransaction
      onSelect(txn);
      onClose();
    } catch (err) {
      console.error('Failed to consume M-Pesa payment:', err);
      alert('Network error. Please try again.');
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SEARCH M-PESA PAYMENT">
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-4">Search by customer name, phone number, or M-Pesa transaction code.</p>
        
        <form onSubmit={handleSearch} className="relative mb-6">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. John / 0740... / UJ1KZ8"
            className="w-full pl-12 pr-24 py-4 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <button 
            type="submit"
            disabled={!query.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg disabled:opacity-50"
          >
            SEARCH
          </button>
        </form>

        {isSearching && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin mb-4"></div>
            <p className="font-medium text-sm">Searching transactions...</p>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="font-medium">No matching transactions found.</p>
            <p className="text-sm mt-1">Try a different search term or check your Till directly.</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Matching Payments</p>
            
            {results.map((txn, idx) => {
              const isAmountMatch = txn.amount === targetAmount;
              const isSelecting = selectingId === txn.transactionId;
              const displayName = txn.customerName
                ? txn.customerName
                : txn.isEnriched ? 'Unknown' : 'Verifying...';
              
              return (
                <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${isAmountMatch ? 'bg-green-50/50 border-green-200 hover:bg-green-50' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{displayName}</p>
                      {!txn.isEnriched && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          <Clock className="w-2.5 h-2.5" /> Verifying...
                        </span>
                      )}
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {txn.phoneNumber?.length > 15 ? 'Hidden (Privacy)' : txn.phoneNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-gray-900 font-mono">{txn.transactionId}</span>
                      <span className="text-gray-500">{new Date(txn.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${isAmountMatch ? 'text-green-700' : 'text-gray-900'}`}>
                        KSh {txn.amount.toLocaleString()}
                      </p>
                      {isAmountMatch ? (
                        <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3 h-3" /> Amount Match
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 justify-end">
                          <AlertTriangle className="w-3 h-3" /> Mismatch
                        </p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleSelect(txn)}
                      disabled={isSelecting}
                      className="px-6 py-3 bg-white border-2 border-gray-200 hover:border-green-500 hover:text-green-600 font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSelecting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> CLAIMING...</>
                      ) : 'SELECT'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
