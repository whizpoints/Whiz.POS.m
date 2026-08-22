import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

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
      const res = await fetch(`/api/outlets/${outletId}/products/batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` 
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
            <h2 className="text-xl font-bold">Assign Products in Batch</h2>
            <p className="text-sm text-gray-500">Select multiple products to assign to this outlet</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products to assign..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No available products match your search.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border-b mb-2" onClick={toggleSelectAll}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                  onChange={toggleSelectAll}
                />
                <span className="ml-3 font-semibold">Select All ({filteredProducts.length})</span>
              </div>
              
              {filteredProducts.map(p => (
                <label key={p.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                  <div className="ml-3 flex-1 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">SKU: {p.sku} | Category: {p.category || 'Uncategorized'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">KES {p.price.toLocaleString()}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {selectedIds.size} products selected
          </span>
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? 'Assigning...' : `Assign ${selectedIds.size} Products`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
