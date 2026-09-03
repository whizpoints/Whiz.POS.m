import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Download, Filter, Printer, FileText, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../lib/utils';
import { useBranchContext } from '../context/BranchContext';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailReceiptId, setEmailReceiptId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('whiz-token');
        // For Electron, we need the absolute URL to the local backend. For web, relative URL uses Vite proxy.
        const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
        const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
        const response = await fetch(`${API_BASE_URL}/api/dashboard/sales${query}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.receipts) {
            setSales(data.receipts);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sales', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [activeLocationId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return 'badge-success';
      case 'Pending': return 'badge-warning';
      case 'Refunded': return 'badge-error';
      default: return 'badge-info';
    }
  };

  
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo) return toast.error('Email address is required');
    if (!emailReceiptId) return;

    setIsSendingEmail(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/email/send-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          receiptId: emailReceiptId,
          recipientEmail: emailTo
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Receipt sent successfully!');
        setIsEmailModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to send receipt. Check your email settings.');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = (type: 'receipt' | 'invoice', id: string) => {
    const token = localStorage.getItem('whiz-token');
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
    window.open(`${API_BASE_URL}/api/documents/${type}/${id}?token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6 px-4 py-4 md:p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[color:var(--text-primary)]">Sales & Transactions</h1>
          <p className="text-[color:var(--text-secondary)]">View all receipts, refunds, and transaction logs.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="btn btn-primary">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-[color:var(--border-glass)] flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input type="text" placeholder="Search receipt number or customer..." className="input !pl-9" />
          </div>
        </div>
        <div className="hidden md:block table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Time</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-[color:var(--text-muted)]">Loading sales data...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-[color:var(--text-muted)]">No sales found</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono font-medium text-[color:var(--accent-primary)]">{sale.receiptNumber}</td>
                    <td className="font-medium">{sale.customerPhone || 'Walk-in'}</td>
                    <td className="font-tabular font-semibold">{sale.totalAmount}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-[color:var(--text-muted)]" />
                        {sale.paymentMethod}
                      </div>
                    </td>
                    <td className="text-[color:var(--text-muted)]">{new Date(sale.createdAt).toLocaleString()}</td>
                    <td><span className={`badge ${getStatusBadge(sale.status)}`}>{sale.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePrint('receipt', sale.id)}
                          className="btn btn-icon btn-ghost btn-sm" 
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4 text-pink-600" />
                        </button>
                        <button 
                          onClick={() => {
                            setEmailReceiptId(sale.id);
                            setEmailTo(sale.customerEmail || '');
                            setIsEmailModalOpen(true);
                          }}
                          className="p-1.5 md:p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Email Receipt"
                        >
                          <Mail className="w-4 h-4 text-blue-600" />
                        </button>

                        <button 
                          onClick={() => handlePrint('invoice', sale.id)}
                          className="btn btn-icon btn-ghost btn-sm" 
                          title="Print A4 Invoice"
                        >
                          <FileText className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="md:hidden divide-y divide-[color:var(--border-glass)]">
          {loading ? (
            <div className="p-4 text-center text-[color:var(--text-muted)]">Loading sales data...</div>
          ) : sales.length === 0 ? (
            <div className="p-4 text-center text-[color:var(--text-muted)]">No sales found</div>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono font-medium text-[color:var(--accent-primary)]">{sale.receiptNumber}</div>
                    <div className="text-sm font-medium">{sale.customerPhone || 'Walk-in'}</div>
                  </div>
                  <div className="font-tabular font-semibold">{sale.totalAmount}</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusBadge(sale.status)}`}>{sale.status}</span>
                    <div className="text-xs text-[color:var(--text-muted)] flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      {sale.paymentMethod}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePrint('receipt', sale.id)}
                      className="btn btn-icon btn-ghost btn-sm h-8 w-8" 
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4 text-pink-600" />
                        </button>
                        <button 
                          onClick={() => {
                            setEmailReceiptId(sale.id);
                            setEmailTo(sale.customerEmail || '');
                            setIsEmailModalOpen(true);
                          }}
                          className="p-1.5 md:p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Email Receipt"
                        >
                          <Mail className="w-4 h-4 text-blue-600" />
                        </button>

                    <button 
                      onClick={() => handlePrint('invoice', sale.id)}
                      className="btn btn-icon btn-ghost btn-sm h-8 w-8" 
                      title="Print A4 Invoice"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {isEmailModalOpen && emailReceiptId && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Email Receipt</h2>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-500 hover:text-slate-800">&times;</button>
            </div>
            <form onSubmit={handleSendEmail} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Email</label>
                <input 
                  type="email" 
                  value={emailTo} 
                  onChange={e => setEmailTo(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="customer@example.com"
                  required
                />
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