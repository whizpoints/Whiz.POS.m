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
        stock: product.stock || 0,
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES)</label>
              <input type="number" required min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
              <input type="number" required min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial In-Store Stock (Main Warehouse)</label>
              <input type="number" required min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} disabled={!!product} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <input type="number" required min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.reorderLevel} onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) })} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Product</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
