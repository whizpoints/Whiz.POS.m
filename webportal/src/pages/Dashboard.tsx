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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-7 text-white shadow-xl border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 sm:mb-3 border border-indigo-400/20">
              <Sparkles className="w-3.5 h-3.5" /> Real-time Cloud Back Office
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-heading">
              Enterprise Dashboard
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Live synchronized sales performance, multi-terminal monitoring, and automated daily reconciliation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {closingData && (
              <button 
                onClick={handlePrintDailyClosing}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer"
                title="Print 80mm Daily Closing Report / Z-Slip"
              >
                <Printer className="w-4 h-4" /> Print Daily Closing
              </button>
            )}
            <button 
              onClick={fetchStats}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm border border-white/10 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Liquid Glass Bento KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
        
        {/* TOP BENTO SECTION: Gross Sales (Hero Left, 2 rows) + Cash & M-Pesa (Right, 2 rows) */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 xl:contents">
          
          {/* 1. Gross Sales Volume: Hero Large Card (Left side, takes 2 rows on mobile) */}
          <div className="col-span-1 row-span-2 xl:col-span-1 xl:row-span-1 relative overflow-hidden rounded-2xl md:rounded-3xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-emerald-500/[0.12] via-teal-500/[0.06] to-cyan-500/[0.02] bg-white/75 dark:bg-slate-900/60 backdrop-blur-2xl border border-emerald-400/30 dark:border-emerald-500/25 shadow-[0_8px_32px_rgba(16,185,129,0.08)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.16)] transition-all duration-300 hover:scale-[1.01] group min-h-[175px] sm:min-h-[190px]">
            {/* Ambient liquid glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none rounded-2xl md:rounded-3xl" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Gross
              </span>
            </div>

            <div className="relative z-10 my-auto">
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Gross Sales Volume
              </div>
              <div className="text-base sm:text-lg md:text-xl xl:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight break-words">
                KES {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="relative z-10 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-semibold">
              <span>All registers</span>
              <span className="font-mono">{receiptCount} receipts</span>
            </div>
          </div>

          {/* 2. Cash Collections: Top Right Card */}
          <div className="col-span-1 row-span-1 xl:col-span-1 relative overflow-hidden rounded-2xl p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-teal-500/[0.09] via-cyan-500/[0.04] to-transparent bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-teal-400/25 dark:border-teal-500/20 shadow-[0_4px_20px_rgba(20,184,166,0.06)] hover:shadow-[0_8px_25px_rgba(20,184,166,0.12)] transition-all duration-300 hover:scale-[1.01] group min-h-[82px] sm:min-h-[90px]">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
            <div className="relative z-10 flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-400/25 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded-full border border-teal-500/20 font-mono">
                {totalRevenue > 0 ? Math.round((cashAmount / totalRevenue) * 100) : 0}%
              </span>
            </div>
            <div className="relative z-10">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Cash Collections
              </div>
              <div className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white font-mono tracking-tight leading-snug truncate">
                KES {cashAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
            </div>
          </div>

          {/* 3. M-Pesa Collections: Bottom Right Card */}
          <div className="col-span-1 row-span-1 xl:col-span-1 relative overflow-hidden rounded-2xl p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-sky-500/[0.09] via-blue-500/[0.04] to-transparent bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-sky-400/25 dark:border-sky-500/20 shadow-[0_4px_20px_rgba(14,165,233,0.06)] hover:shadow-[0_8px_25px_rgba(14,165,233,0.12)] transition-all duration-300 hover:scale-[1.01] group min-h-[82px] sm:min-h-[90px]">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
            <div className="relative z-10 flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/25 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.2 rounded-full border border-sky-500/20 font-mono">
                {totalRevenue > 0 ? Math.round((mpesaAmount / totalRevenue) * 100) : 0}%
              </span>
            </div>
            <div className="relative z-10">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                M-Pesa Collections
              </div>
              <div className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white font-mono tracking-tight leading-snug truncate">
                KES {mpesaAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM BENTO SECTION: Store Credit & Invoices (Left, 2 rows) + Average Ticket (Hero Right, 2 rows) */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 xl:contents">

          {/* 4. Store Credit / Debts: Top Left Card */}
          <div className="col-span-1 row-span-1 xl:col-span-1 relative overflow-hidden rounded-2xl p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-amber-500/[0.09] via-orange-500/[0.04] to-transparent bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-amber-400/25 dark:border-amber-500/20 shadow-[0_4px_20px_rgba(245,158,11,0.06)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.12)] transition-all duration-300 hover:scale-[1.01] group min-h-[82px] sm:min-h-[90px]">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
            <div className="relative z-10 flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/25 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded-full border border-amber-500/20">
                Unsettled
              </span>
            </div>
            <div className="relative z-10">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Store Credit
              </div>
              <div className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white font-mono tracking-tight leading-snug truncate">
                KES {creditAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
            </div>
          </div>

          {/* 5. Finalized Invoices: Bottom Left Card */}
          <div className="col-span-1 row-span-1 xl:col-span-1 relative overflow-hidden rounded-2xl p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-indigo-500/[0.09] via-purple-500/[0.04] to-transparent bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-indigo-400/25 dark:border-indigo-500/20 shadow-[0_4px_20px_rgba(99,102,241,0.06)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.12)] transition-all duration-300 hover:scale-[1.01] group min-h-[82px] sm:min-h-[90px]">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
            <div className="relative z-10 flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-400/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded-full border border-indigo-500/20 font-mono">
                {stats?.completedCount || receiptCount} Done
              </span>
            </div>
            <div className="relative z-10">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Finalized Invoices
              </div>
              <div className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white font-mono tracking-tight leading-snug truncate">
                {receiptCount.toLocaleString()} Bills
              </div>
            </div>
          </div>

          {/* 6. Average Ticket Value: Hero Large Card (Right side, takes 2 rows on mobile) */}
          <div className="col-span-1 row-span-2 xl:col-span-1 xl:row-span-1 relative overflow-hidden rounded-2xl md:rounded-3xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-purple-500/[0.12] via-fuchsia-500/[0.06] to-pink-500/[0.02] bg-white/75 dark:bg-slate-900/60 backdrop-blur-2xl border border-purple-400/30 dark:border-purple-500/25 shadow-[0_8px_32px_rgba(168,85,247,0.08)] hover:shadow-[0_12px_40px_rgba(168,85,247,0.16)] transition-all duration-300 hover:scale-[1.01] group min-h-[175px] sm:min-h-[190px]">
            {/* Ambient liquid glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-purple-500/20 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none rounded-2xl md:rounded-3xl" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-2xs">
                Avg Basket
              </span>
            </div>

            <div className="relative z-10 my-auto">
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Average Ticket Value
              </div>
              <div className="text-base sm:text-lg md:text-xl xl:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight break-words">
                KES {avgTicket.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
            </div>

            <div className="relative z-10 pt-2 border-t border-purple-500/15 flex items-center justify-between text-[10px] sm:text-[11px] text-purple-700/80 dark:text-purple-300/80 font-semibold">
              <span>Per customer</span>
              <span className="font-mono">Spend Index</span>
            </div>
          </div>

        </div>

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
