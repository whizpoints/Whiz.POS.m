import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, Receipt, CreditCard, DollarSign } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import WelcomePopup from '../components/WelcomePopup';

interface DashboardStats {
  totalSales: number;
  receiptCount: number;
  completedCount: number;
  recentReceipts: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
        const res = await fetch(`${API_BASE_URL}/api/dashboard/summary${query}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to load dashboard data');
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeLocationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-muted)]">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 m-4 text-red-500 bg-red-50 border border-red-200 rounded-lg">
        {error}
      </div>
    );
  }

  const kpis = [
    { label: 'Total Cloud Sales', val: `KES ${(stats?.totalSales || 0).toLocaleString()}`, delta: '+12.5%', up: true, icon: <DollarSign />, color: 'var(--accent-primary)', orb: 'var(--accent-primary)' },
    { label: 'Cloud Receipts', val: stats?.receiptCount || 0, delta: '+5.2%', up: true, icon: <Receipt />, color: 'var(--accent-success)', orb: 'var(--accent-success)' },
    { label: 'Completed Sales', val: stats?.completedCount || 0, delta: '+5.0%', up: true, icon: <Activity />, color: 'var(--accent-tertiary)', orb: 'var(--accent-tertiary)' },
    { label: 'Average Sale', val: `KES ${(stats?.receiptCount ? (stats.totalSales / stats.receiptCount) : 0).toLocaleString()}`, delta: '-1.2%', up: false, icon: <CreditCard />, color: 'var(--accent-warning)', orb: 'var(--accent-warning)' }
  ];

  return (
    <>
      <WelcomePopup />
      <div className="space-y-5 animate-in px-4 py-4 md:p-6">
      <section>
        <div className="kpi-grid">
          {kpis.map((k, i) => (
            <div className="kpi-card" key={i}>
              <div className="kpi-orb" style={{ background: k.orb }} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.val}</div>
                  <span className={`kpi-delta ${k.up ? 'up' : 'down'}`}>
                    {k.up ? <ArrowUpRight /> : <ArrowDownRight />}
                    {k.delta}
                  </span>
                </div>
                <div className="kpi-icon-wrap" style={{ background: `color-mix(in oklab, ${k.color} 16%, transparent)`, color: k.color }}>
                  {k.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Recent Cloud Syncs</h2>
            <p className="section-desc">Latest transactions synced from your local POS registers.</p>
          </div>
        </div>
        
        <div className="glass-panel overflow-hidden">
          <div className="table-scroll">
            <div className="hidden md:block">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Customer</th>
                    <th className="font-tabular text-right">Amount (KES)</th>
                    <th>Sync Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentReceipts && stats.recentReceipts.length > 0 ? (
                    stats.recentReceipts.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-xs text-[var(--accent-primary)] font-semibold">{r.receiptNumber}</td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 
                            'bg-slate-100 text-slate-700 ring-1 ring-slate-600/10'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td>{r.paymentMethod || '-'}</td>
                        <td className="text-slate-500">{r.customerName || 'Walk-in'}</td>
                        <td className="font-tabular font-medium text-right text-[var(--text-primary)]">{(r.totalAmount || 0).toLocaleString()}</td>
                        <td className="text-slate-500 text-sm whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">No recent cloud syncs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col divide-y divide-gray-100">
              {stats?.recentReceipts && stats.recentReceipts.length > 0 ? (
                stats.recentReceipts.map((r) => (
                  <div key={r.id} className="p-4 flex flex-col gap-2 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-blue-600 font-semibold">{r.receiptNumber}</span>
                        <span className="text-sm font-medium text-gray-900 mt-0.5">{r.customerName || 'Walk-in Customer'}</span>
                      </div>
                      <span className="font-tabular font-bold text-gray-900">KES {(r.totalAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {r.status} • {r.paymentMethod || 'CASH'}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No recent cloud syncs found.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}

