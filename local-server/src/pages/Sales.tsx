import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Download, Filter, Printer, FileText, X } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeLocationId } = useBranchContext();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailReceiptId, setEmailReceiptId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

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
    setDocumentUrl(`${API_BASE_URL}/api/documents/${type}/${id}?token=${token}`);
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in">
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
        <div className="table-scroll">
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
      </div>
      
      {documentUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Document Viewer</h3>
              <button onClick={() => setDocumentUrl(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 bg-gray-50 p-4 relative">
              <iframe 
                src={documentUrl} 
                className="w-full h-full bg-white shadow-sm border border-gray-200"
                title="Document Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
