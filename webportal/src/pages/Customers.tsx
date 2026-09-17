import { useState, useEffect } from 'react';
import { Search, Plus, Star, Edit2, Trash2, Mail, RefreshCw } from 'lucide-react';
import CustomerModal from '../components/Customers/CustomerModal';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../lib/utils';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const token = localStorage.getItem('whiz-token');
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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

  
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return toast.error('Subject and Body are required');
    if (!emailCustomer?.email) return toast.error('Customer has no email address');

    setIsSendingEmail(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/email/send-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          to: emailCustomer.email,
          subject: emailSubject,
          body: emailBody
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Email sent successfully!');
        setIsEmailModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to send email. Check your settings.');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsSendingEmail(false);
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
    <div className="space-y-4 animate-in px-4 py-4 md:p-6">
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
          
          <div className="hidden md:block table-scroll">
            <table className="data-table w-full">
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
                  <tr><td colSpan={5} className="text-center py-8 text-[color:var(--text-muted)]">Loading...</td></tr>
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
                          <button onClick={() => { setEmailCustomer(c); setEmailSubject(''); setEmailBody(''); setIsEmailModalOpen(true); }} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-blue-500" title="Send Email">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(c)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-sky-600">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        

                          <button onClick={() => handleDelete(c.id)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="text-center py-8 text-[color:var(--text-muted)]">No customers found. Add your first customer.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[color:var(--border-glass)]">
            {loading ? (
              <div className="p-4 text-center text-[color:var(--text-muted)]">Loading...</div>
            ) : customers.length > 0 ? (
              customers.map(c => (
                <div key={c.id} className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color:var(--accent-tertiary)]/10 text-[color:var(--accent-tertiary)] font-bold text-xs">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{c.name}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">{c.phone || 'No phone'} • {c.email || 'No email'}</div>
                      </div>
                    </div>
                    <div className="font-tabular font-semibold text-right">KES {c.totalSpent.toLocaleString()}</div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="inline-flex items-center gap-1 text-[color:var(--accent-warning)] font-semibold bg-[color:var(--accent-warning)]/10 px-2 py-0.5 rounded-full text-xs">
                      <Star className="w-3 h-3 fill-current" />
                      {c.loyaltyPoints} PTS
                    </span>
                    <div className="flex gap-2">
                          <button onClick={() => { setEmailCustomer(c); setEmailSubject(''); setEmailBody(''); setIsEmailModalOpen(true); }} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-blue-500" title="Send Email">
                            <Mail className="w-4 h-4" />
                          </button>
                      <button onClick={() => handleEdit(c)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] h-8 w-8">
                        <Edit2 className="w-4 h-4" />
                        </button>
                        

                      <button onClick={() => handleDelete(c.id)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-[color:var(--text-muted)]">No customers found. Add your first customer.</div>
            )}
          </div>
        </div>
      </section>
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
        onComplete={fetchCustomers}
      />
      
      {isEmailModalOpen && emailCustomer && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Email {emailCustomer.name}</h2>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-500 hover:text-slate-800">&times;</button>
            </div>
            <form onSubmit={handleSendEmail} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input 
                  type="text" 
                  value={emailSubject} 
                  onChange={e => setEmailSubject(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Hello from WhizPOS"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea 
                  value={emailBody} 
                  onChange={e => setEmailBody(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none" 
                  placeholder="Type your message here..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSendingEmail} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}