import { useState, useEffect } from 'react';
import { 
  ArrowUpRight, Activity, Receipt, CreditCard, DollarSign, 
  Smartphone, Wallet, Users, TrendingUp, Sparkles, RefreshCw, Eye, Printer 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useBranchContext } from '../context/BranchContext';
import { Link } from 'react-router-dom';
import { printThermalClosingSlip, type ClosingReportData } from '../lib/closingSlip';

interface DashboardStats {
  totalSales: number;
  receiptCount: number;
  completedCount: number;
  recentReceipts: any[];
  cashTotal?: number;
  mpesaTotal?: number;
  creditTotal?: number;
  paymentBreakdown?: Array<{ name: string; value: number; color: string }>;
  trend?: Array<{ label: string; sales: number; count?: number }>;
  topCashiers?: Array<{ name: string; sales: number; count: number }>;
  branches?: any[];
}

export default function Dashboard() {
  const { activeLocationId } = useBranchContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [closingData, setClosingData] = useState<ClosingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
      
      const [summaryRes, closingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/summary${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/dashboard/closing-report`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (!summaryRes.ok) throw new Error('Failed to load dashboard data');
      const data = await summaryRes.json();
      setStats(data);

      if (closingRes.ok) {
        const cData = await closingRes.json();
        setClosingData(cData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeLocationId]);

  const handlePrintDailyClosing = () => {
    if (!closingData) return;
    printThermalClosingSlip(closingData);
  };

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
  const cashAmount = stats?.cashTotal || (closingData?.summary.cashTotal ?? 0);
  const mpesaAmount = stats?.mpesaTotal || (closingData?.summary.mpesaTotal ?? 0);
  const creditAmount = stats?.creditTotal || (closingData?.summary.creditTotal ?? 0);
  const receiptCount = stats?.receiptCount || (closingData?.summary.receiptCount ?? 0);
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
      icon: <Wallet className="w-5 h-5 text-teal-600" />, 
      color: 'from-teal-500/10 to-cyan-500/5', 
      border: 'border-teal-200 dark:border-teal-800/40' 
    },
    { 
      label: 'M-Pesa Collections', 
      val: `KES ${mpesaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: `${totalRevenue > 0 ? Math.round((mpesaAmount / totalRevenue) * 100) : 0}% of revenue`,
      icon: <Smartphone className="w-5 h-5 text-sky-600" />, 
      color: 'from-sky-500/10 to-blue-500/5', 
      border: 'border-sky-200 dark:border-sky-800/40' 
    },
    { 
      label: 'Store Credit / Debts', 
      val: `KES ${creditAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: 'Unsettled balances',
      icon: <CreditCard className="w-5 h-5 text-amber-600" />, 
      color: 'from-amber-500/10 to-orange-500/5', 
      border: 'border-amber-200 dark:border-amber-800/40' 
    },
    { 
      label: 'Finalized Invoices', 
      val: receiptCount.toLocaleString(), 
      sub: `${stats?.completedCount || receiptCount} completed`,
      icon: <Receipt className="w-5 h-5 text-indigo-600" />, 
      color: 'from-indigo-500/10 to-purple-500/5', 
      border: 'border-indigo-200 dark:border-indigo-800/40' 
    },
    { 
      label: 'Average Ticket Value', 
      val: `KES ${avgTicket.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, 
      sub: 'Per customer spend',
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />, 
      color: 'from-purple-500/10 to-pink-500/5', 
      border: 'border-purple-200 dark:border-purple-800/40' 
    }
  ];

  const paymentBreakdownData = stats?.paymentBreakdown || [
    { name: 'Cash', value: cashAmount || 1, color: '#10b981' },
    { name: 'M-Pesa', value: mpesaAmount || 1, color: '#06b6d4' },
    { name: 'Credit', value: creditAmount || 0, color: '#f59e0b' }
  ];

  const trendData: Array<{ label: string; sales: number; count?: number }> = (stats?.trend && stats.trend.length > 0)
    ? stats.trend
    : [{ label: 'Today', sales: totalRevenue, count: receiptCount }];
  const topCashiers = stats?.topCashiers || closingData?.cashiers || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-7 text-white shadow-xl border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/20">
              <Sparkles className="w-3.5 h-3.5" /> Real-time Cloud Back Office
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white font-heading">
              Enterprise Dashboard
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Live synchronized sales performance, multi-terminal monitoring, and automated daily reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {closingData && (
              <button 
                onClick={handlePrintDailyClosing}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2"
                title="Print 80mm Daily Closing Report / Z-Slip"
              >
                <Printer className="w-4 h-4" /> Print Daily Closing (80mm)
              </button>
            )}
            <button 
              onClick={fetchStats}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm border border-white/10 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div 
            key={idx} 
            className={`relative p-5 rounded-2xl bg-gradient-to-br ${kpi.color} bg-white dark:bg-slate-900/60 border ${kpi.border} shadow-sm transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                {kpi.icon}
              </div>
              {kpi.tag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {kpi.tag}
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{kpi.label}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{kpi.val}</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Area Chart */}
        <div className="glass-panel p-6 lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> 7-Day Revenue Velocity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated sales across POS registers</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-900">
              Live Trajectory
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portalSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`KES ${Number(val).toLocaleString()}`, 'Sales']}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#portalSalesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Donut Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-teal-500" /> Payment Mix
            </h3>
            <p className="text-xs text-slate-500 mb-4">Breakdown by tender type</p>
            <div className="h-52 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b', color: '#fff', fontSize: '12px' }}
                    formatter={(v: any) => [`KES ${Number(v).toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-semibold text-slate-400">Total</span>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  KES {totalRevenue >= 1000 ? `${(totalRevenue/1000).toFixed(1)}k` : totalRevenue}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            {paymentBreakdownData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  KES {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cashier Grid & Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashier Matrix */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Cashier Matrix
            </h3>
            <span className="text-xs font-semibold text-slate-400">{topCashiers.length} Active</span>
          </div>

          {topCashiers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No active cashier transactions today.</div>
          ) : (
            <div className="space-y-3">
              {topCashiers.map((c: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-400">{c.count || 0} bills finalized</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-slate-900 dark:text-white font-mono">
                      KES {(c.sales || c.totalSales || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {totalRevenue > 0 ? `${Math.round(((c.sales || c.totalSales || 0) / totalRevenue) * 100)}% share` : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Synchronized Receipts Feed */}
        <div className="glass-panel p-6 lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" /> Recent Synced Transactions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Live transactions uploaded from local POS terminals</p>
            </div>
            <Link to="/sales" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Cashier / Staff</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(stats?.recentReceipts || []).slice(0, 7).map((rcpt: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {rcpt.receiptNumber || rcpt.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {rcpt.createdAt ? new Date(rcpt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {rcpt.cashierName || 'Cashier'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold uppercase text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {rcpt.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-white">
                      KES {Number(rcpt.totalAmount || rcpt.total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                        (rcpt.status || 'COMPLETED').toUpperCase() === 'COMPLETED' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {rcpt.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link 
                        to="/sales" 
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors inline-block"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
