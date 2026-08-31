import React, { useState } from 'react';
import { Search, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal } from '../../ui/modal';
import { usePosStore } from '../../../store/posStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetAmount: number;
}

export default function SearchModal({ isOpen, onClose, targetAmount }: Props) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

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
        const localUsedCodes = usePosStore.getState().transactions.map(t => t.mpesaCode).filter(Boolean);
        const filteredTxns = txns.filter((t: any) => !localUsedCodes.includes(t.transactionId));
        
        setResults(filteredTxns.map((t: any) => ({
          transactionId: t.transactionId,
          customerName: t.customerName || 'Customer',
          phoneNumber: t.phoneNumber,
          amount: t.amount,
          timestamp: t.timestamp
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
            placeholder="e.g. John / 0740... / W32"
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
              const isMatch = txn.amount === targetAmount;
              
              return (
                <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${isMatch ? 'bg-green-50/50 border-green-200 hover:bg-green-50' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">
                        {(txn.customerName && txn.customerName.trim().split(' ').length < 2 && txn.customerName !== 'Customer') 
                          ? `${txn.customerName} (M-Pesa)` 
                          : (txn.customerName || 'Unknown')}
                      </p>
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {txn.phoneNumber?.length > 15 ? 'Hidden (Privacy)' : txn.phoneNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-gray-900">{txn.transactionId}</span>
                      <span className="text-gray-500">{new Date(txn.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${isMatch ? 'text-green-700' : 'text-gray-900'}`}>
                        KSh {txn.amount.toLocaleString()}
                      </p>
                      {isMatch ? (
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
                      onClick={() => {
                        // Pass back to till monitor via store/props (in real implementation)
                        onClose();
                      }}
                      className="px-6 py-3 bg-white border-2 border-gray-200 hover:border-green-500 hover:text-green-600 font-bold text-sm rounded-xl transition-all"
                    >
                      SELECT
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
