import React, { useState } from 'react';
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
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Batch Assign Products</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select products to assign to this outlet. Already assigned items are excluded.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products by name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={toggleSelectAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            {selectedIds.size === filteredProducts.length ? 'Deselect All' : 'Select All Shown'}
          </button>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No matching products found.' : 'All organization products are already assigned to this outlet.'}
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div 
                  key={p.id} 
                  onClick={() => toggleSelect(p.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => {}} // Handled by div click
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.sku || 'No SKU'} • {p.category || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-gray-900">KES {Number(p.price || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Total Stock: {p.stock ?? 0}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            <strong>{selectedIds.size}</strong> product(s) selected
          </span>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : `Assign Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
