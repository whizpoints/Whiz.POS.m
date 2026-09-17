import { useState, useEffect } from 'react';
import { Plus, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import StaffModal from '../components/Staff/StaffModal';
import toast from 'react-hot-toast';
import { Trash2, Edit2 } from 'lucide-react';

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeLocationId } = useBranchContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
      const response = await fetch(`${API_BASE_URL}/api/dashboard/staff${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.staff) {
          setStaff(data.staff);
        }
      }
    } catch (error) {
      console.error('Failed to fetch staff', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [activeLocationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Staff deleted successfully');
        fetchStaff();
      } else {
        toast.error('Failed to delete staff');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleEdit = (employee: any) => {
    setSelectedStaff(employee);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedStaff(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[color:var(--text-primary)]">Staff & Permissions</h1>
          <p className="text-[color:var(--text-secondary)]">Manage cashier accounts, roles, and access control.</p>
        </div>
        <button onClick={handleNew} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-[color:var(--text-muted)]">Loading staff data...</div>
        ) : staff.length === 0 ? (
          <div className="col-span-full text-center py-8 text-[color:var(--text-muted)]">No staff members found</div>
        ) : (
          staff.map((employee) => (
          <div key={employee.id} className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[color:var(--accent-primary-soft)] flex items-center justify-center text-[color:var(--accent-primary)] font-bold text-lg">
                  {employee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-[color:var(--text-primary)]">{employee.name}</h3>
                  <p className="text-xs text-[color:var(--text-muted)]">{employee.id}</p>
                </div>
              </div>
              <span className={`badge ${employee.status === 'Active' ? 'badge-success' : 'badge-muted'}`}>
                {employee.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-[color:var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[color:var(--accent-tertiary)]" />
                <span className="font-medium text-[color:var(--accent-tertiary)]">{employee.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[color:var(--text-muted)]" />
                {employee.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[color:var(--text-muted)]" />
                {employee.phone}
              </div>
            </div>

            <div className="pt-3 border-t border-[color:var(--border-glass)] flex justify-end gap-2">
              <button onClick={() => handleEdit(employee)} className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"><Edit2 className="w-4 h-4" /> Edit</button>
              <button onClick={() => handleDelete(employee.id)} className="btn btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          ))
        )}
      </div>

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staff={selectedStaff}
        onComplete={fetchStaff}
      />
    </div>
  );
}
