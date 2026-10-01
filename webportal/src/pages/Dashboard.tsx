let cachedStats: any = null;
let isStatsLoaded = false;
import { useState, useEffect } from 'react';
import { Activity, Receipt, CreditCard, DollarSign, Store, TrendingUp } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface DashboardStats {
  totalSales: number;
  receiptCount: number;
  completedCount: number;
  recentReceipts: any[];
  branches?: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(cachedStats);
  const [loading, setLoading] = useState(!isStatsLoaded);
  const [error, setError] = useState('');
  const { activeLocationId, locations } = useBranchContext();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!isStatsLoaded) setLoading(true);
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        // Fetch global summary and recent receipts
        const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
        const summaryRes = await fetch(`${API_BASE_URL}/api/dashboard/summary${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!summaryRes.ok) throw new Error('Failed to load dashboard summary');
        const summaryData = await summaryRes.json();

        // If 'ALL' is selected, fetch branch breakdown
        let branches = [];
        if (activeLocationId === 'ALL') {
          const reportRes = await fetch(`${API_BASE_URL}/api/dashboard/reports?groupBy=branch`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (reportRes.ok) {
            const reportData = await reportRes.json();
            branches = reportData.chartData || [];
          }
        }

        cachedStats = { ...summaryData, branches };
          isStatsLoaded = true;
          setStats({ ...summaryData, branches });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeLocationId]);

  if (loading) {
    return <LoadingSpinner message="Syncing Cloud Data..." />;
  }

  if (error) {
    return (
      <div className="p-4 m-4 text-red-500 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <Activity className="w-5 h-5" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Cloud Sales', val: `KES ${(stats?.totalSales || 0).toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, bg: 'bg-blue-50', color: 'text-blue-600', ring: 'ring-blue-500/20' },
    { label: 'Total Receipts', val: stats?.receiptCount || 0, icon: <Receipt className="w-5 h-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600', ring: 'ring-emerald-500/20' },
    { label: 'Completed Transactions', val: stats?.completedCount || 0, icon: <Activity className="w-5 h-5" />, bg: 'bg-violet-50', color: 'text-violet-600', ring: 'ring-violet-500/20' },
    { label: 'Average Value', val: `KES ${(stats?.receiptCount ? (stats.totalSales / stats.receiptCount) : 0).toLocaleString(undefined, {maximumFractionDigits:0})}`, icon: <CreditCard className="w-5 h-5" />, bg: 'bg-orange-50', color: 'text-orange-600', ring: 'ring-orange-500/20' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 py-6 md:p-8 max-w-[1600px] mx-auto">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {activeLocationId === 'ALL' ? 'Enterprise Overview' : `${locations.find((l: any) => l.id === activeLocationId)?.name || 'Branch'} Overview`}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Live synchronized data from your local servers.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700">Real-time Sync Active</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white to-transparent opacity-50 translate-x-6 -translate-y-6 rounded-full`} />
            <div className="flex justify-between items-start mb-2 sm:mb-3 relative z-10">
              <div className={`p-2 rounded-lg ${k.bg} ${k.color} ${k.ring} ring-1`}>
                {k.icon}
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-slate-500 font-medium text-xs sm:text-sm mb-0.5 truncate">{k.label}</h3>
              <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">{k.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Branch Performance Grid (Only visible to Super Admins / ALL selected) */}
      {activeLocationId === 'ALL' && stats?.branches && stats.branches.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-500" />
              Branch Performance
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.branches.map((b, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-blue-400/30 transition-colors" />
                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1 flex items-center gap-2">
                      {b.name}
                    </h3>
                    <p className="text-blue-200 text-sm font-medium">Live POS Sync</p>
                  </div>
                  <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/10">
                    <TrendingUp className="w-5 h-5 text-blue-300" />
                  </div>
                </div>
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Revenue</p>
                    <p className="font-bold text-xl">KES {b.sales.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Est. Profit</p>
                    <p className="font-bold text-xl text-emerald-400">KES {b.profit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Syncs Table */}
      <section className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Cloud Syncs</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Latest transactions synced from POS registers.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <th className="px-6 py-4">Receipt No</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Amount (KES)</th>
                <th className="px-6 py-4">Sync Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recentReceipts && stats.recentReceipts.length > 0 ? (
                stats.recentReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{r.receiptNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                        r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.paymentMethod || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {r.customerName ? r.customerName.charAt(0).toUpperCase() : 'W'}
                      </div>
                      {r.customerName || 'Walk-in'}
                    </td>
                    <td className="px-6 py-4 font-tabular font-bold text-right text-slate-900">
                      {(r.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm font-medium whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-slate-400" />
                      </div>
                      <p>No recent cloud syncs found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}


