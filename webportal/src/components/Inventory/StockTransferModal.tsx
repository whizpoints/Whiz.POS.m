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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Transfer Stock</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {activeLocationId === 'ALL' ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
              Please select a specific Location from the branch selector first.
            </div>
          ) : outlets.length === 0 ? (
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
              No outlets found for this location. Create an Outlet in Settings first.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
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

              <div className="flex items-center justify-center gap-4 text-gray-400">
                <div className="flex-1 h-px bg-gray-200"></div>
                <ArrowRight className="w-5 h-5" />
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Outlet (Terminal)</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
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
