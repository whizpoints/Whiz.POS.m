import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplier?: any;
  onComplete: () => void;
}

export default function SupplierModal({ isOpen, onClose, supplier, onComplete }: Props) {
  const { activeLocationId } = useBranchContext();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    contactPerson: '',
    status: 'ACTIVE'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        contactPerson: supplier.contactPerson || '',
        status: supplier.status || 'ACTIVE'
      });
    } else {
      setFormData({
        name: '', phone: '', email: '', contactPerson: '', status: 'ACTIVE'
      });
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = supplier ? `${API_BASE_URL}/api/suppliers/${supplier.id}` : `${API_BASE_URL}/api/suppliers`;
      const method = supplier ? 'PUT' : 'POST';

      const payload = { 
        ...formData, 
        locationId: activeLocationId === 'ALL' ? undefined : activeLocationId 
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Supplier ${supplier ? 'updated' : 'created'} successfully!`);
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
          <h2 className="text-xl font-bold text-gray-900">{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Supplier</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
