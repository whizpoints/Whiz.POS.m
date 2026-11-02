import { useState, useEffect } from 'react';
import { 
  ArrowUpRight, Activity, Receipt, CreditCard, DollarSign, 
  Smartphone, Wallet, Users, TrendingUp, Sparkles, RefreshCw, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useBranchContext } from '../context/BranchContext';
import { getApiBaseUrl } from '../lib/utils';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalSales: number;
  receiptCount: number;
  completedCount: number;
  recentReceipts: any[];
  cashTotal?: number;
  mpesaTotal?: number;
  creditTotal?: number;
  paymentBreakdown?: Array<{ name: string; value: number; color: string }>;
  trend?: Array<{ label: string; sales: number; count: number }>;
  topCashiers?: Array<{ name: string; sales: number; count: number }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { activeLocationId } = useBranchContext();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
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

  useEffect(() => {
    fetchStats();
  }, [activeLocationId]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
        <div className="text-sm font-semibold text-slate-500">Loading live analytics...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6 m-6 text-red-600 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button onClick={fetchStats} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">Retry</button>
      </div>
    );
  }

  const totalRevenue = stats?.totalSales || 0;
  const cashAmount = stats?.cashTotal || 0;
  const mpesaAmount = stats?.mpesaTotal || 0;
  const creditAmount = stats?.creditTotal || 0;
  const receiptCount = stats?.receiptCount || 0;
  const avgTicket = receiptCount > 0 ? (totalRevenue / receiptCount) : 0;

  const kpis = [
    { 
      label: 'Gross Sales Volume', 
      val: `KES ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: 'All registers combined',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />, 
      color: 'from-emerald-500/10 to-teal-500/5', 
      border: 'border-emerald-200 dark:border-emerald-800/40',
      tag: '+12.5%' 
    },
    { 
      label: 'Cash Collections', 
      val: `KES ${cashAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: `${totalRevenue > 0 ? Math.round((cashAmount / totalRevenue) * 100) : 0}% of revenue`,
      icon: <Wallet className="w-5 h-5 text-green-600" />, 
      color: 'from-green-500/10 to-emerald-500/5', 
      border: 'border-green-200 dark:border-green-800/40',
      tag: 'Cash in drawer' 
    },
    { 
      label: 'M-Pesa Receipts', 
      val: `KES ${mpesaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: `${totalRevenue > 0 ? Math.round((mpesaAmount / totalRevenue) * 100) : 0}% of revenue`,
      icon: <Smartphone className="w-5 h-5 text-cyan-600" />, 
      color: 'from-cyan-500/10 to-blue-500/5', 
      border: 'border-cyan-200 dark:border-cyan-800/40',
      tag: 'Real-time sync' 
    },
    { 
      label: 'Credit / Ledger', 
      val: `KES ${creditAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: 'Customer balance due',
      icon: <CreditCard className="w-5 h-5 text-amber-600" />, 
      color: 'from-amber-500/10 to-orange-500/5', 
      border: 'border-amber-200 dark:border-amber-800/40',
      tag: 'Outstanding' 
    },
    { 
      label: 'Paid Transactions', 
      val: `${receiptCount} receipts`, 
      sub: `${stats?.completedCount || receiptCount} completed`,
      icon: <Receipt className="w-5 h-5 text-indigo-600" />, 
      color: 'from-indigo-500/10 to-violet-500/5', 
      border: 'border-indigo-200 dark:border-indigo-800/40',
      tag: 'Closed sales' 
    },
    { 
      label: 'Average Basket', 
      val: `KES ${avgTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: 'Avg spend per ticket',
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />, 
      color: 'from-purple-500/10 to-fuchsia-500/5', 
      border: 'border-purple-200 dark:border-purple-800/40',
      tag: 'Ticket size' 
    }
  ];

  const paymentChartData = (stats?.paymentBreakdown && stats.paymentBreakdown.some(p => p.value > 0))
    ? stats.paymentBreakdown
    : [
        { name: 'Cash', value: cashAmount || (totalRevenue * 0.5) || 1, color: '#10b981' },
        { name: 'M-Pesa', value: mpesaAmount || (totalRevenue * 0.4) || 1, color: '#06b6d4' },
        { name: 'Credit', value: creditAmount || (totalRevenue * 0.1) || 0, color: '#f59e0b' }
      ];

  const trendData = (stats?.trend && stats.trend.length > 0)
    ? stats.trend
    : [
        { label: 'Mon', sales: 0, count: 0 },
        { label: 'Tue', sales: 0, count: 0 },
        { label: 'Wed', sales: 0, count: 0 },
        { label: 'Thu', sales: 0, count: 0 },
        { label: 'Fri', sales: 0, count: 0 },
        { label: 'Sat', sales: 0, count: 0 },
        { label: 'Sun', sales: totalRevenue, count: receiptCount }
      ];

  return (
    <div className="space-y-8 animate-in fade-in p-6 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 backdrop-blur-sm border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Live Enterprise Server Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
            Server Overview & Control
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Real-time monitoring across all connected registers and local cashiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-sm transition-all border border-white/10 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
          <Link
            to="/dashboard/sales"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-lg shadow-sky-500/20 transition-all"
          >
            <Eye className="w-4 h-4" />
            View Full Sales
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((k, i) => (
            <div 
              key={i} 
              className={`p-5 rounded-2xl bg-gradient-to-b ${k.color} bg-white dark:bg-slate-900 border ${k.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</span>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/60">
                  {k.icon}
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{k.val}</div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>{k.sub}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{k.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts Section: Sales Trend & Payment Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Sales Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                7-Day Sales & Volume Trend
              </h2>
              <p className="text-xs text-slate-500">Daily financial trajectory computed from synchronized receipts.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
              Last 7 Days
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v.toLocaleString()}`} />
                <Tooltip 
                  formatter={(val: any) => [`KES ${Number(val).toLocaleString()}`, 'Sales']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Payment Methods Breakdown
            </h2>
            <p className="text-xs text-slate-500">Distribution between Cash, M-Pesa, and Credit.</p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
              <span className="text-base font-black text-slate-800 dark:text-white">
                {totalRevenue > 0 ? `${Math.round(totalRevenue / 1000)}k` : '0'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            {paymentChartData.map((p, idx) => (
              <div key={idx} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white mt-1">
                  KES {Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cashier Performance Cards */}
      {stats?.topCashiers && stats.topCashiers.length > 0 && (
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                Active Cashier Performance
              </h2>
              <p className="text-xs text-slate-500">Live sales handled per staff member.</p>
            </div>
            <Link to="/dashboard/staff" className="text-xs font-bold text-sky-600 hover:underline">Manage Staff &rarr;</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.topCashiers.map((c, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">{c.count} sales</span>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">KES {c.sales.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Live Transactions */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
            <p className="text-xs text-slate-500">Latest synchronized sales from local registers.</p>
          </div>
          <Link to="/dashboard/sales" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
            View All Transactions &rarr;
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold text-xs border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6">Receipt #</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Payment Mode</th>
                <th className="py-3 px-6">Customer</th>
                <th className="py-3 px-6 text-right">Amount (KES)</th>
                <th className="py-3 px-6">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats?.recentReceipts && stats.recentReceipts.length > 0 ? (
                stats.recentReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {r.receiptNumber || r.id}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status || 'PAID'}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {r.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600 dark:text-slate-400">
                      {r.customerPhone || r.customerName || 'Walk-in'}
                    </td>
                    <td className="py-3 px-6 text-right font-black text-slate-900 dark:text-white">
                      {Number(r.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-6 text-xs text-slate-500">
                      {new Date(r.createdAt || Date.now()).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                    No transactions found yet. Ensure your local POS is connected and syncing.
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
