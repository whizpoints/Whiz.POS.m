import { useState, useEffect } from 'react';
import { X, ArrowRight, Save } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onTransferComplete: () => void;
}

export default function StockTransferModal({ isOpen, onClose, products, onTransferComplete }: Props) {
  const { activeLocationId } = useBranchContext();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && activeLocationId && activeLocationId !== 'ALL') {
      fetchOutlets();
    }
  }, [isOpen, activeLocationId]);

  const fetchOutlets = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/outlets/${activeLocationId!}`, {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) setOutlets(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedOutletId || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      let user: any = {};
      try {
        const uStr = localStorage.getItem('whiz-user');
        if (uStr && uStr !== 'undefined') user = JSON.parse(uStr);
      } catch(e) {}
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      
      const res = await fetch(`${API_BASE_URL}/api/ledger/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify({
          businessId: user.businessId,
          locationId: activeLocationId,
          productId: selectedProductId,
          outletId: selectedOutletId,
          quantity
        })
      });

      if (res.ok) {
        toast.success('Stock transferred successfully!');
        onTransferComplete();
        onClose();
        setSelectedProductId('');
        setSelectedOutletId('');
        setQuantity(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Transfer failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transfer Stock</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Move inventory units between central warehouse and store registers</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {activeLocationId === 'ALL' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-xl text-sm">
              Please select a specific Location from the branch selector first.
            </div>
          ) : outlets.length === 0 ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 rounded-xl text-sm">
              No outlets found for this location. Create an Outlet in Settings first.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Product</label>
                <select 
                  className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Available: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center gap-4 text-slate-400">
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
                <ArrowRight className="w-5 h-5 text-blue-500" />
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Destination Outlet (Terminal)</label>
                <select 
                  className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedOutletId}
                  onChange={e => setSelectedOutletId(e.target.value)}
                  required
                >
                  <option value="">Select an outlet...</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Transfer Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-tabular font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-5 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Transferring...' : <><Save className="w-4 h-4" /> Transfer Stock</>}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
