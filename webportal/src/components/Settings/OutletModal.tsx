import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  outlet?: any;
  onComplete: () => void;
}

export default function OutletModal({ isOpen, onClose, outlet, onComplete }: Props) {
  const { activeLocationId } = useBranchContext();
  const [formData, setFormData] = useState({
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (outlet) {
      setFormData({
        name: outlet.name || ''
      });
    } else {
      setFormData({
        name: ''
      });
    }
  }, [outlet, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let user: any = {};
      try {
        const uStr = localStorage.getItem('whiz-user');
        if (uStr && uStr !== 'undefined') user = JSON.parse(uStr);
      } catch(e) {}
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = outlet ? `${API_BASE_URL}/api/outlets/${outlet.id}` : `${API_BASE_URL}/api/outlets`;
      const method = outlet ? 'PUT' : 'POST';

      const payload = { 
        ...formData, 
        businessId: user.businessId,
        locationId: activeLocationId === 'ALL' ? undefined : activeLocationId 
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Outlet ${outlet ? 'updated' : 'created'} successfully!`);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{outlet ? 'Edit Outlet' : 'New Outlet'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name</label>
            <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="e.g. Register 1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Outlet</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
