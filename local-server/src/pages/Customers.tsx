import { useState, useEffect } from 'react';
import { Search, Plus, Star, Edit2, Trash2 } from 'lucide-react';
import { getApiBaseUrl } from '../lib/utils';
import CustomerModal from '../components/Customers/CustomerModal';
import toast from 'react-hot-toast';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const token = localStorage.getItem('whiz-token');
    try {
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Customer deleted successfully');
        fetchCustomers();
      } else {
        toast.error('Failed to delete customer');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-in p-6">
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Customers & CRM</h2>
            <p className="section-desc">Manage customer profiles, loyalty points, and purchase history.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleNew} className="btn btn-primary btn-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-3 border-b border-[color:var(--border-glass)]">
            <div className="search-box flex-1 max-w-md" style={{ minWidth: 0 }}>
              <Search />
              <input placeholder="Search name, phone, or email..." />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['All', 'VIP', 'Recent'].map((c, i) => (
                <button key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact Info</th>
                  <th className="font-tabular text-right">Loyalty Points</th>
                  <th className="font-tabular text-right">Total Spent (KES)</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                ) : customers.length > 0 ? (
                  customers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color:var(--accent-tertiary)]/10 text-[color:var(--accent-tertiary)] font-bold text-xs">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold">{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-[color:var(--text-primary)]">{c.phone || 'N/A'}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">{c.email}</div>
                      </td>
                      <td className="font-tabular text-right">
                        <span className="inline-flex items-center gap-1 text-[color:var(--accent-warning)] font-semibold bg-[color:var(--accent-warning)]/10 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          {c.loyaltyPoints}
                        </span>
                      </td>
                      <td className="font-tabular font-semibold text-right">{c.totalSpent.toLocaleString()}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(c)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[color:var(--text-muted)]">
                      No customers found. Add your first customer!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
        onComplete={fetchCustomers}
      />
    </div>
  );
}
