import { useState, useEffect } from 'react';
import { FileBarChart, Download, TrendingUp, Printer, Users, Receipt, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useBranchContext } from '../context/BranchContext';
import { getCachedData, setCachedData } from '../lib/cache';
import { printThermalClosingSlip, type ClosingReportData } from '../lib/closingSlip';

export default function Reports() {
  const { activeLocationId } = useBranchContext();
  
  // Dynamic filters
  const [groupBy, setGroupBy] = useState('day');
  const [dateFilter, setDateFilter] = useState('7d');

  const cacheKey = `reports_${activeLocationId || 'ALL'}_${groupBy}_${dateFilter}`;
  const defaultChart = [{ name: 'Mon', sales: 0, profit: 0 }];
  const defaultStats = { revenue: 0, revenueDelta: 0, profit: 0, profitDelta: 0, transactions: 0, transactionsDelta: 0 };

  const [data, setData] = useState<any[]>(() => getCachedData(`${cacheKey}_chart`, defaultChart));
  const [stats, setStats] = useState(() => getCachedData(`${cacheKey}_stats`, defaultStats));
  const [closingData, setClosingData] = useState<ClosingReportData | null>(null);
  const [, setIsRefreshing] = useState(false);

  useEffect(() => {
    setData(getCachedData(`${cacheKey}_chart`, defaultChart));
    setStats(getCachedData(`${cacheKey}_stats`, defaultStats));

    const fetchReports = async () => {
      try {
        setIsRefreshing(true);
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        const params = new URLSearchParams();
        if (activeLocationId !== 'ALL') params.append('locationId', activeLocationId);
        params.append('groupBy', groupBy);
        
        if (dateFilter === '7d') {
           const d = new Date(); d.setDate(d.getDate() - 7);
           params.append('startDate', d.toISOString());
        } else if (dateFilter === '30d') {
           const d = new Date(); d.setDate(d.getDate() - 30);
           params.append('startDate', d.toISOString());
        }

        const [repRes, closeRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/dashboard/reports?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/dashboard/closing-report`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (repRes.ok) {
          const resData = await repRes.json();
          if (resData.chartData) {
            setData(resData.chartData);
            setCachedData(`${cacheKey}_chart`, resData.chartData);
          }
          if (resData.stats) {
            setStats(resData.stats);
            setCachedData(`${cacheKey}_stats`, resData.stats);
          }
        }

        if (closeRes.ok) {
          const cData = await closeRes.json();
          setClosingData(cData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchReports();
  }, [activeLocationId, groupBy, dateFilter]);

  const handlePrintDailyClosing = () => {
    if (!closingData) return;
    printThermalClosingSlip(closingData);
  };

  const handlePrintCashierSlip = (cashierName: string) => {
    if (!closingData) return;
    printThermalClosingSlip(closingData, cashierName);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[color:var(--text-primary)]">Reports & Analytics</h1>
          <p className="text-[color:var(--text-secondary)]">Daily closing Z-slips, cashier reconciliation, open tabs, and revenue forecasting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {closingData && (
            <button
              onClick={handlePrintDailyClosing}
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-2 shadow-sm"
              title="Print 80mm Daily Closing Report / Z-Slip"
            >
              <Printer className="w-4 h-4" /> Print Daily Closing (80mm)
            </button>
          )}

          <div className="flex rounded-lg border border-[color:var(--border-subtle)] p-0.5 bg-[color:var(--bg-glass-strong)]">
            <button 
              onClick={() => setDateFilter('7d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateFilter === '7d' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'}`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setDateFilter('30d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateFilter === '30d' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'}`}
            >
              30 Days
            </button>
          </div>

          <button className="btn btn-secondary inline-flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Today's Paid Sales</div>
          <div className="text-3xl font-black text-emerald-500 mb-2">
            KES {(closingData?.summary.totalSales || stats.revenue).toLocaleString()}
          </div>
          <div className="text-xs text-[color:var(--text-muted)]">
            Cash: KES {(closingData?.summary.cashTotal || 0).toLocaleString()} | M-Pesa: KES {(closingData?.summary.mpesaTotal || 0).toLocaleString()}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Active Unpaid Tabs</div>
          <div className="text-3xl font-black text-amber-500 mb-2">
            KES {(closingData?.unpaidTotal || 0).toLocaleString()}
          </div>
          <div className="text-xs text-[color:var(--text-muted)]">
            {(closingData?.unpaidTabs || []).length} open hospitality / bar bills pending
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Estimated Profit</div>
          <div className="text-3xl font-black text-blue-500 mb-2">
            KES {stats.profit.toLocaleString()}
          </div>
          <div className={`flex items-center gap-1 text-xs ${stats.profitDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <TrendingUp className={`w-3.5 h-3.5 ${stats.profitDelta < 0 && 'rotate-180'}`} /> {stats.profitDelta > 0 ? '+' : ''}{stats.profitDelta}% from last period
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Completed Bills</div>
          <div className="text-3xl font-black text-[color:var(--text-primary)] mb-2">
            {(closingData?.summary.receiptCount || stats.transactions).toLocaleString()}
          </div>
          <div className="text-xs text-[color:var(--text-muted)]">
            Total sales receipts finalized
          </div>
        </div>
      </div>

      {/* Cashier Closing Slips & Active Tabs Row */}
      {closingData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cashiers Section */}
          <div className="glass-panel p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[color:var(--border-subtle)]">
              <div className="flex items-center gap-2 font-bold text-lg text-[color:var(--text-primary)]">
                <Users className="w-5 h-5 text-indigo-500" />
                Cashier Shift Slips (Individual End-of-Day)
              </div>
              <span className="text-xs text-[color:var(--text-muted)]">Print 80mm slip for cashier reconciliation</span>
            </div>

            {(closingData.cashiers || []).length === 0 ? (
              <p className="text-sm text-[color:var(--text-secondary)] py-4 text-center">No cashier activity recorded today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border-subtle)] text-xs text-[color:var(--text-muted)] uppercase">
                      <th className="py-2.5">Cashier</th>
                      <th className="py-2.5">Bills</th>
                      <th className="py-2.5">Cash</th>
                      <th className="py-2.5">M-Pesa</th>
                      <th className="py-2.5">Credit</th>
                      <th className="py-2.5 font-bold">Total Sales</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border-subtle)]">
                    {closingData.cashiers.map((c, i) => (
                      <tr key={i} className="hover:bg-[color:var(--bg-glass-strong)] transition-colors">
                        <td className="py-3 font-semibold text-[color:var(--text-primary)] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xs font-bold">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                          {c.name}
                        </td>
                        <td className="py-3">{c.count}</td>
                        <td className="py-3 text-emerald-600 dark:text-emerald-400 font-mono">KES {(c.cashTotal || 0).toLocaleString()}</td>
                        <td className="py-3 text-cyan-600 dark:text-cyan-400 font-mono">KES {(c.mpesaTotal || 0).toLocaleString()}</td>
                        <td className="py-3 text-amber-600 dark:text-amber-400 font-mono">KES {(c.creditTotal || 0).toLocaleString()}</td>
                        <td className="py-3 font-bold font-mono text-[color:var(--text-primary)]">KES {c.totalSales.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handlePrintCashierSlip(c.name)}
                            className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1.5 hover:border-indigo-500 hover:text-indigo-500"
                            title="Print 80mm shift slip for this cashier"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Open Tabs / Unpaid Bills */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[color:var(--border-subtle)]">
              <div className="flex items-center gap-2 font-bold text-lg text-[color:var(--text-primary)]">
                <Receipt className="w-5 h-5 text-amber-500" />
                Active Open Tabs (Unpaid)
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {(closingData.unpaidTabs || []).length} Tabs
              </span>
            </div>

            {(closingData.unpaidTabs || []).length === 0 ? (
              <div className="py-8 text-center text-sm text-[color:var(--text-muted)] flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6 text-emerald-500" />
                All customer bills are settled! Zero unpaid tabs.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {closingData.unpaidTabs.map((t, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-500/5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[color:var(--text-primary)]">
                        {t.tableNumber ? `Table ${t.tableNumber}` : `Bill #${String(t.receiptNumber).slice(-6)}`}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {t.customerName} • {t.cashierName || 'Cashier'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-amber-600 dark:text-amber-400 font-mono">
                        KES {t.totalAmount.toLocaleString()}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Open Tab
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[color:var(--border-subtle)] flex items-center justify-between text-sm font-bold">
              <span>Total Outstanding Tabs:</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono text-base">
                KES {(closingData.unpaidTotal || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-[color:var(--accent-primary)]" />
              Revenue vs Profit
            </h3>
            <div className="flex rounded-lg border border-[color:var(--border-subtle)] p-0.5 bg-[color:var(--bg-glass-strong)]">
              <button 
                onClick={() => setGroupBy('day')}
                className={`px-2 py-1 text-xs font-semibold rounded transition-all ${groupBy === 'day' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-[color:var(--text-secondary)]'}`}
              >
                By Day
              </button>
              <button 
                onClick={() => setGroupBy('branch')}
                className={`px-2 py-1 text-xs font-semibold rounded transition-all ${groupBy === 'branch' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-[color:var(--text-secondary)]'}`}
              >
                By Branch
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass-strong)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `K${value/1000}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-glass-strong)', borderRadius: '8px', border: '1px solid var(--border-glass-strong)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="var(--accent-success)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[color:var(--accent-tertiary)]" />
            Sales Volume
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass-strong)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `K${value/1000}`} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-glass)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-glass-strong)', borderRadius: '8px', border: '1px solid var(--border-glass-strong)' }}
                />
                <Bar dataKey="sales" fill="var(--accent-tertiary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
