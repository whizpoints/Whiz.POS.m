import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staff?: any;
  onComplete: () => void;
}

export default function StaffModal({ isOpen, onClose, staff, onComplete }: Props) {
  const { activeLocationId } = useBranchContext();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CASHIER',
    status: 'Active',
    password: '',
    pin: '',
    outletId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/outlets', { headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` } })
      .then(res => res.json()).then(data => setOutlets(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role || 'CASHIER',
        status: staff.status || 'Active',
        password: '', // Password left blank when editing
        pin: staff.pin || '',
        outletId: staff.outletId || ''
      });
    } else {
      setFormData({
        name: '', email: '', phone: '', role: 'CASHIER', status: 'Active', password: '', pin: '', outletId: ''
      });
    }
  }, [staff, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
      const url = staff ? `${API_BASE_URL}/api/users/${staff.id}` : `${API_BASE_URL}/api/users`;
      const method = staff ? 'PUT' : 'POST';

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
        toast.success(`Staff ${staff ? 'updated' : 'created'} successfully!`);
        onComplete();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Operation failed');
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
          <h2 className="text-xl font-bold text-gray-900">{staff ? 'Edit Staff' : 'New Staff'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional for Cashiers)</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Outlet (Optional)</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white" value={formData.outletId} onChange={e => setFormData({ ...formData, outletId: e.target.value })}>
                <option value="">All Outlets / HQ</option>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">4-Digit PIN (For POS Login)</label>
              <input type="text" maxLength={4} pattern="\d{4}" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="e.g. 1234" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password {staff && <span className="text-gray-400 font-normal">(Leave blank to keep unchanged)</span>}</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="For Web Dashboard Login" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Staff</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
