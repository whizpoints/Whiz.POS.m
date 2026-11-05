import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onComplete: () => void;
}

export default function ProductModal({ isOpen, onClose, product, onComplete }: Props) {
  const { activeLocationId } = useBranchContext();
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    reorderLevel: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || '',
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        stock: product.inStoreStock ?? product.stock ?? 0,
        reorderLevel: product.reorderLevel || 5
      });
    } else {
      setFormData({
        sku: '', name: '', category: '', price: 0, costPrice: 0, stock: 0, reorderLevel: 5
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = product ? `${API_BASE_URL}/api/inventory/${product.id}` : `${API_BASE_URL}/api/inventory`;
      const method = product ? 'PUT' : 'POST';

      const payload = { ...formData, locationId: activeLocationId === 'ALL' ? undefined : activeLocationId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Product ${product ? 'updated' : 'created'} successfully!`);
        onComplete();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Operation failed');
      }
    } catch (err) {
      toast.error('Network error');
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{product ? 'Edit Product' : 'New Product'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define catalog specifications and base pricing</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">SKU / Code *</label>
              <input 
                type="text" 
                required 
                className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.sku} 
                onChange={e => setFormData({ ...formData, sku: e.target.value })} 
                placeholder="e.g. BEV-001"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Product Name *</label>
              <input 
                type="text" 
                required 
                className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. Fresh Milk 500ml"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Category</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.category} 
              onChange={e => setFormData({ ...formData, category: e.target.value })} 
              placeholder="e.g. Dairy, Beverages, Snacks"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Selling Price (KES) *</label>
              <input 
                type="number" 
                required 
                min="0" 
                className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-tabular font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                value={formData.price} 
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Cost Price (KES)</label>
              <input 
                type="number" 
                required 
                min="0" 
                className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-tabular text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.costPrice} 
                onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Initial In-Store Stock</label>
              <input 
                type="number" 
                required 
                min="0" 
                className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.stock} 
                onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Reorder Alert Level</label>
              <input 
                type="number" 
                required 
                min="0" 
                className="w-full border border-slate-300 dark:border-white/15 rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.reorderLevel} 
                onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) })} 
              />
            </div>
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
              {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Product</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
