import { useState } from 'react';
import { X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../../lib/utils';

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: string;
  allProducts: any[];
  assignedProductIds: string[];
  locationId: string;
  onComplete: () => void;
}

export default function BatchAssignModal({ 
  isOpen, 
  onClose, 
  outletId, 
  allProducts, 
  assignedProductIds, 
  locationId,
  onComplete 
}: BatchAssignModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter out products that are already assigned to this outlet
  const unassignedProducts = allProducts.filter(p => !assignedProductIds.includes(p.id));
  
  const filteredProducts = unassignedProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${outletId}/products/batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          productIds: Array.from(selectedIds), 
          locationId: locationId === 'ALL' ? undefined : locationId 
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Successfully assigned ${data.addedCount} products!`);
        onComplete();
        onClose();
        setSelectedIds(new Set());
      } else {
        toast.error(data.error || 'Failed to assign products');
      }
    } catch (e) {
      toast.error('Network error during batch assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Products in Batch</h2>
            <p className="text-sm text-gray-500">Select multiple products to assign to this outlet</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50/50 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {filteredProducts.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors whitespace-nowrap"
            >
              {selectedIds.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {searchTerm ? 'No products matching your search' : 'All catalog products are already assigned to this outlet'}
            </div>
          ) : (
            filteredProducts.map(product => {
              const isSelected = selectedIds.has(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => toggleSelect(product.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-400 font-mono">SKU: {product.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">KES {Number(product.price).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{product.category || 'General'}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600 font-medium">
            Selected: <span className="font-bold text-gray-900">{selectedIds.size}</span> products
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0 || isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Assigning...' : `Assign ${selectedIds.size} Products`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
