import { useState, useEffect } from 'react';
import { Search, Plus, Phone, Building2, Edit2, Trash2 } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import SupplierModal from '../components/Suppliers/SupplierModal';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeLocationId } = useBranchContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.whizpoint.app';
        const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
        const response = await fetch(`${API_BASE_URL}/api/dashboard/suppliers${query}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.suppliers) {
            setSuppliers(data.suppliers);
          }
        }
      } catch (error) {
        console.error('Failed to fetch suppliers', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, [activeLocationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Supplier deleted successfully');
        // trigger re-fetch
        setLoading(true);
        const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
        const response = await fetch(`${API_BASE_URL}/api/dashboard/suppliers${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.suppliers || []);
        }
      } else {
        toast.error('Failed to delete supplier');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[color:var(--text-primary)]">Suppliers & Purchase Orders</h1>
          <p className="text-[color:var(--text-secondary)]">Manage your suppliers, purchase orders, and inbound stock.</p>
        </div>
        <button onClick={handleNew} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Supplier
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-[color:var(--border-glass)]">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input type="text" placeholder="Search suppliers..." className="input !pl-9" />
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier ID</th>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-[color:var(--text-muted)]">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-[color:var(--text-muted)]">No suppliers found</td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="font-mono text-xs text-[color:var(--text-muted)]">{supplier.id}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-[color:var(--bg-tertiary)] flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-[color:var(--text-secondary)]" />
                        </div>
                        <span className="font-semibold">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="text-[color:var(--text-muted)]">-</td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="w-3.5 h-3.5 text-[color:var(--text-muted)]" />
                        {supplier.phone || supplier.email || supplier.contactPerson || 'N/A'}
                      </div>
                    </td>
                    <td className="text-[color:var(--text-muted)]">-</td>
                    <td>
                      <span className={`badge ${supplier.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(supplier)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(supplier.id)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={selectedSupplier}
        onComplete={() => {
          setLoading(true);
          const token = localStorage.getItem('whiz-token');
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
          fetch(`${API_BASE_URL}/api/dashboard/suppliers${query}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => { setSuppliers(data.suppliers || []); setLoading(false); })
            .catch(() => setLoading(false));
        }}
      />
    </div>
  );
}
