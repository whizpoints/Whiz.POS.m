import { useState, useEffect, useMemo } from 'react';
import {
  FileBarChart, Download, TrendingUp, Printer, Users, Receipt,
  DollarSign, Package, AlertTriangle, CheckCircle2, Search,
  Sparkles, ShieldCheck, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useBranchContext } from '../context/BranchContext';
import { getCachedData, setCachedData } from '../lib/cache';
import { printThermalClosingSlip, type ClosingReportData } from '../lib/closingSlip';
import { generateExecutiveDailyPdf, type ExecutiveReportData } from '../lib/executivePdf';
import toast from 'react-hot-toast';

export default function Reports() {
  const { activeLocationId } = useBranchContext();
  const [activeTab, setActiveTab] = useState<'executive' | 'valuation' | 'deadstock' | 'pareto' | 'stocktake' | 'cashier_shift' | 'mpesa_reconcile'>('executive');
  
  // Executive Overview Filters
  const [groupBy, setGroupBy] = useState('day');
  const [dateFilter, setDateFilter] = useState('7d');

  const cacheKey = `reports_${activeLocationId || 'ALL'}_${groupBy}_${dateFilter}`;
  const defaultChart = [{ name: 'Mon', sales: 0, profit: 0 }];
  const defaultStats = { revenue: 0, revenueDelta: 0, profit: 0, profitDelta: 0, transactions: 0, transactionsDelta: 0 };

  const [data, setData] = useState<any[]>(() => getCachedData(`${cacheKey}_chart`, defaultChart));
  const [stats, setStats] = useState(() => getCachedData(`${cacheKey}_stats`, defaultStats));
  const [closingData, setClosingData] = useState<ClosingReportData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab 2: Stock Valuation State
  const [valuationData, setValuationData] = useState<any>(null);
  const [valuationSearch, setValuationSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Tab 3: Dead Stock State
  const [deadStockData, setDeadStockData] = useState<any>(null);
  const [deadStockDays, setDeadStockDays] = useState('30');

  // Tab 4: Pareto Bestsellers State
  const [paretoData, setParetoData] = useState<any>(null);
  const [paretoPeriod, setParetoPeriod] = useState('30d');

  // Tab 5: Stocktake Variance State
  const [stocktakeItems, setStocktakeItems] = useState<any[]>([]);
  const [stocktakeFilter, setStocktakeFilter] = useState<'ALL' | 'DISCREPANCIES' | 'SHRINKAGE' | 'SURPLUS'>('ALL');
  const [isCommittingStocktake, setIsCommittingStocktake] = useState(false);

  // Tab 6: Cash Float & Shift Reconciliation State
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [pettyCashPayouts, setPettyCashPayouts] = useState<number>(0);
  const [countedCash, setCountedCash] = useState<string>('');
  const [shiftCashier, setShiftCashier] = useState<string>('All Cashiers');

  // Tab 7: M-Pesa Statement Reconciler State
  const [pastedMpesaText, setPastedMpesaText] = useState('');
  const [mpesaReconcileResult, setMpesaReconcileResult] = useState<any>(null);
  const [isReconcilingMpesa, setIsReconcilingMpesa] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const token = localStorage.getItem('whiz-token');

  // Load Executive Data
  const fetchReports = async () => {
    try {
      setIsRefreshing(true);
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

  useEffect(() => {
    fetchReports();
  }, [activeLocationId, groupBy, dateFilter]);

  // Lazy Load Other Tabs
  useEffect(() => {
    if (activeTab === 'valuation' && !valuationData) {
      fetch(`${API_BASE_URL}/api/dashboard/reports/stock-valuation`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(setValuationData)
      .catch(console.error);
    } else if (activeTab === 'deadstock') {
      fetch(`${API_BASE_URL}/api/dashboard/reports/dead-stock?days=${deadStockDays}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(setDeadStockData)
      .catch(console.error);
    } else if (activeTab === 'pareto') {
      fetch(`${API_BASE_URL}/api/dashboard/reports/pareto-bestsellers?period=${paretoPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(setParetoData)
      .catch(console.error);
    } else if (activeTab === 'stocktake' && stocktakeItems.length === 0) {
      fetch(`${API_BASE_URL}/api/dashboard/reports/stocktake-variance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(res => {
        if (res.products) setStocktakeItems(res.products);
      })
      .catch(console.error);
    }
  }, [activeTab, deadStockDays, paretoPeriod]);

  // Executive Daily PDF Download
  const handleDownloadExecutivePdf = async () => {
    try {
      toast.loading('Generating Executive PDF Report...', { id: 'pdf' });
      const res = await fetch(`${API_BASE_URL}/api/dashboard/reports/executive-daily`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch executive daily data');
      const dailyData: ExecutiveReportData = await res.json();
      
      // If user recorded shift petty cash payouts on this screen, incorporate real data
      if ((!dailyData.expenses || dailyData.expenses.length === 0) && pettyCashPayouts > 0) {
        dailyData.expenses = [
          {
            description: 'Cash Drawer Petty Cash Outflow',
            category: 'Operating Expense',
            amount: pettyCashPayouts,
            authorizedBy: shiftCashier !== 'All Cashiers' ? shiftCashier : 'Shift Cashier',
            paidVia: 'Cash Drawer'
          }
        ];
        dailyData.totalExpenses = pettyCashPayouts;
        dailyData.netProfit = dailyData.metrics.grossProfit - pettyCashPayouts;
      }

      generateExecutiveDailyPdf(dailyData);
      toast.success('Executive PDF downloaded successfully!', { id: 'pdf' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to download PDF', { id: 'pdf' });
    }
  };

  // Stocktake Count Change
  const handleCountChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    setStocktakeItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, countedStock: isNaN(num) ? '' : num };
      }
      return item;
    }));
  };

  // Commit Stocktake
  const handleCommitStocktake = async () => {
    try {
      setIsCommittingStocktake(true);
      const discrepancies = stocktakeItems.filter(i => {
        const counted = i.countedStock === '' ? i.expectedStock : Number(i.countedStock);
        return counted !== i.expectedStock;
      });

      if (discrepancies.length === 0) {
        toast.success('All counted items match expected system stock! Nothing to reconcile.');
        setIsCommittingStocktake(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/dashboard/reports/stocktake-commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          counts: discrepancies.map(i => ({
            productId: i.productId,
            actualStock: i.countedStock === '' ? i.expectedStock : Number(i.countedStock),
            expectedStock: i.expectedStock,
            costPrice: i.costPrice
          }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully reconciled ${data.reconciledCount} items! Net Variance: KES ${data.netVarianceValue.toLocaleString()}`);
        // Refresh stocktake list
        setStocktakeItems(prev => prev.map(i => ({ ...i, expectedStock: i.countedStock === '' ? i.expectedStock : Number(i.countedStock) })));
      } else {
        toast.error(data.error || 'Failed to commit stocktake');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsCommittingStocktake(false);
    }
  };

  // Parse and Reconcile M-Pesa Text / CSV
  const handleReconcileMpesa = async () => {
    if (!pastedMpesaText.trim()) {
      toast.error('Please paste M-Pesa statement text or codes');
      return;
    }
    setIsReconcilingMpesa(true);
    try {
      // Extract M-Pesa codes e.g. "UK5KZ13A22" and optional amounts
      const lines = pastedMpesaText.split('\n');
      const parsedTransactions: any[] = [];

      for (const line of lines) {
        const codeMatch = line.match(/\b([A-Z0-9]{10})\b/);
        const amountMatch = line.match(/(?:Ksh|KES|\$)?\s?([0-9,]+(?:\.[0-9]{2})?)/i);
        if (codeMatch) {
          const code = codeMatch[1].toUpperCase();
          const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
          parsedTransactions.push({ code, amount });
        }
      }

      if (parsedTransactions.length === 0) {
        toast.error('No valid 10-character M-Pesa codes found in the text');
        setIsReconcilingMpesa(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/dashboard/reports/reconcile-mpesa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statementTransactions: parsedTransactions })
      });

      const result = await res.json();
      if (res.ok) {
        setMpesaReconcileResult(result);
        toast.success(`Reconciled ${result.summary.totalStatementEntries} M-Pesa entries!`);
      } else {
        toast.error(result.error || 'Reconciliation failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Reconciliation failed');
    } finally {
      setIsReconcilingMpesa(false);
    }
  };

  // Filtered Stocktake items
  const filteredStocktake = useMemo(() => {
    return stocktakeItems.filter(item => {
      const counted = item.countedStock === '' ? item.expectedStock : Number(item.countedStock);
      const variance = counted - item.expectedStock;
      if (stocktakeFilter === 'DISCREPANCIES') return variance !== 0;
      if (stocktakeFilter === 'SHRINKAGE') return variance < 0;
      if (stocktakeFilter === 'SURPLUS') return variance > 0;
      return true;
    });
  }, [stocktakeItems, stocktakeFilter]);

  // Cash shift variance calculation
  const activeCashierData = shiftCashier === 'All Cashiers'
    ? null
    : closingData?.cashiers?.find(c => c.name === shiftCashier);
  const cashSalesToday = activeCashierData
    ? activeCashierData.cashTotal
    : (closingData?.summary?.cashTotal || 0);
  const expectedShiftCash = openingFloat + cashSalesToday - pettyCashPayouts;
  const numCountedCash = parseFloat(countedCash) || 0;
  const cashVariance = countedCash ? (numCountedCash - expectedShiftCash) : 0;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[color:var(--text-primary)] flex items-center gap-2.5">
            <FileBarChart className="w-7 h-7 text-emerald-600" />
            Reports & Business Intelligence
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Executive daily summaries, stock valuation, slow-moving items, cashier shifts & M-Pesa reconciler.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchReports}
            disabled={isRefreshing}
            className="btn btn-secondary border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold inline-flex items-center gap-2 shadow-xs px-3.5 py-2 text-sm rounded-xl"
            title="Refresh all reports"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleDownloadExecutivePdf}
            className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-2 shadow-md px-4 py-2 text-sm rounded-xl transition-all hover:scale-102"
            title="Download Beautiful Executive Daily PDF Report"
          >
            <Download className="w-4 h-4" />
            <span>Generate Executive Daily PDF</span>
          </button>

          {closingData && (
            <button
              onClick={() => printThermalClosingSlip(closingData)}
              className="btn btn-secondary border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold inline-flex items-center gap-2 shadow-xs px-3.5 py-2 text-sm rounded-xl"
              title="Print 80mm Daily Closing Report / Z-Slip"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Print 80mm Z-Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-100/80 overflow-x-auto gap-1 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('executive')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'executive' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Executive Daily</span>
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'valuation' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-blue-600" />
          <span>Stock Valuation (Cost vs Retail)</span>
        </button>

        <button
          onClick={() => setActiveTab('deadstock')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'deadstock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Dead & Slow-Moving Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('pareto')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'pareto' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Top 20 Pareto (80/20) Bestsellers</span>
        </button>

        <button
          onClick={() => setActiveTab('stocktake')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'stocktake' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 text-rose-600" />
          <span>Physical Stocktake & Variance</span>
        </button>

        <button
          onClick={() => setActiveTab('cashier_shift')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'cashier_shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          <span>Cash Float & Shift Reconciliation (X/Z)</span>
        </button>

        <button
          onClick={() => setActiveTab('mpesa_reconcile')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'mpesa_reconcile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>M-Pesa Statement Reconciler</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE DAILY & VISUAL CHARTS */}
      {/* ========================================================================= */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glass-card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Today's Paid Sales</div>
              <div className="text-3xl font-black text-emerald-600 mb-2">
                KES {(closingData?.summary.totalSales || stats.revenue).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Cash: KES {(closingData?.summary.cashTotal || 0).toLocaleString()} | M-Pesa: KES {(closingData?.summary.mpesaTotal || 0).toLocaleString()}
              </div>
            </div>

            <div className="glass-card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Unpaid Tabs</div>
              <div className="text-3xl font-black text-amber-500 mb-2">
                KES {(closingData?.unpaidTotal || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {(closingData?.unpaidTabs || []).length} open hospitality / bar bills pending
              </div>
            </div>

            <div className="glass-card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Estimated Gross Profit</div>
              <div className="text-3xl font-black text-blue-600 mb-2">
                KES {stats.profit.toLocaleString()}
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stats.profitDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className={`w-3.5 h-3.5 ${stats.profitDelta < 0 && 'rotate-180'}`} /> {stats.profitDelta > 0 ? '+' : ''}{stats.profitDelta}% vs previous period
              </div>
            </div>

            <div className="glass-card p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Completed Bills</div>
              <div className="text-3xl font-black text-gray-900 mb-2">
                {(closingData?.summary.receiptCount || stats.transactions).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Average Basket: KES {Math.round((closingData?.summary.totalSales || stats.revenue) / Math.max(1, closingData?.summary.receiptCount || stats.transactions)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Cashiers Section & Open Tabs */}
          {closingData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-panel p-5 bg-white border border-gray-200 rounded-2xl shadow-xs lg:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 font-bold text-base text-gray-900">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>Cashier Shift Performance Today</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Individual End-of-Day Slips</span>
                </div>

                {(closingData.cashiers || []).length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No cashier activity recorded today.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                          <th className="py-2.5">Cashier</th>
                          <th className="py-2.5 text-center">Bills</th>
                          <th className="py-2.5 text-right">Cash</th>
                          <th className="py-2.5 text-right">M-Pesa</th>
                          <th className="py-2.5 text-right">Credit</th>
                          <th className="py-2.5 text-right font-bold">Total Sales</th>
                          <th className="py-2.5 text-right">Print</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {closingData.cashiers.map((c, i) => (
                          <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 font-bold text-gray-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                {c.name.slice(0, 1).toUpperCase()}
                              </div>
                              {c.name}
                            </td>
                            <td className="py-3 text-center font-medium">{c.count}</td>
                            <td className="py-3 text-right text-emerald-600 font-mono font-semibold">KES {(c.cashTotal || 0).toLocaleString()}</td>
                            <td className="py-3 text-right text-cyan-600 font-mono font-semibold">KES {(c.mpesaTotal || 0).toLocaleString()}</td>
                            <td className="py-3 text-right text-amber-600 font-mono font-semibold">KES {(c.creditTotal || 0).toLocaleString()}</td>
                            <td className="py-3 text-right font-bold font-mono text-gray-900">KES {c.totalSales.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => printThermalClosingSlip(closingData, c.name)}
                                className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5 text-gray-600" />
                                <span>Slip</span>
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
              <div className="glass-panel p-5 bg-white border border-gray-200 rounded-2xl shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 font-bold text-base text-gray-900">
                    <Receipt className="w-5 h-5 text-amber-500" />
                    <span>Open Customer Tabs</span>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {(closingData.unpaidTabs || []).length} Pending
                  </span>
                </div>

                {(closingData.unpaidTabs || []).length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-2 flex-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-semibold text-gray-800">All customer bills are settled!</span>
                    <span className="text-xs">Zero unpaid tabs on the floor.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 flex-1">
                    {closingData.unpaidTabs.map((t, i) => (
                      <div key={i} className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            {t.tableNumber ? `Table ${t.tableNumber}` : `Bill #${String(t.receiptNumber).slice(-6)}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t.customerName} • {t.cashierName || 'Cashier'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-amber-700 font-mono">
                            KES {t.totalAmount.toLocaleString()}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Unpaid
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm font-bold">
                  <span className="text-gray-700">Total Outstanding Tabs:</span>
                  <span className="text-amber-700 font-mono text-base">
                    KES {(closingData.unpaidTotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Revenue vs Profit Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-base flex items-center gap-2 text-gray-900">
                  <FileBarChart className="w-5 h-5 text-emerald-600" />
                  Revenue vs Estimated Profit
                </h3>
                <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  <button 
                    onClick={() => setDateFilter('7d')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${dateFilter === '7d' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                  >
                    7 Days
                  </button>
                  <button 
                    onClick={() => setDateFilter('30d')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${dateFilter === '30d' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                  >
                    30 Days
                  </button>
                </div>
                <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                  <button 
                    onClick={() => setGroupBy('day')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'day' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                  >
                    By Day
                  </button>
                  <button 
                    onClick={() => setGroupBy('branch')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${groupBy === 'branch' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                  >
                    By Branch
                  </button>
                </div>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `K${val/1000}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="sales" name="Revenue (KES)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="profit" name="Profit (KES)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <h3 className="font-bold text-base mb-6 flex items-center gap-2 text-gray-900">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Sales Volume Trend
              </h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `K${val/1000}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="sales" name="Sales (KES)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCK VALUATION (AT COST VS AT SELLING PRICE) */}
      {/* ========================================================================= */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {valuationData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">Total Inventory Capital (Cost)</div>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  KES {valuationData.summary.totalCostValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">What you paid suppliers</div>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-emerald-700 uppercase">Potential Retail Revenue</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  KES {valuationData.summary.totalRetailValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Total revenue when fully sold</div>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-blue-700 uppercase">Potential Gross Profit</div>
                <div className="text-2xl font-black text-blue-600 mt-1">
                  KES {valuationData.summary.potentialProfit.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Projected profit margin: {valuationData.summary.overallMargin}%</div>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-indigo-700 uppercase">Total Physical Units</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">
                  {valuationData.summary.totalUnits.toLocaleString()} units
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Across all product lines</div>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-purple-700 uppercase">Active Catalog SKUs</div>
                <div className="text-2xl font-black text-purple-600 mt-1">
                  {valuationData.summary.totalProducts} Items
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Distinct product entries</div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={valuationSearch}
                onChange={e => setValuationSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold border border-gray-300 rounded-xl p-2 bg-white focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {(valuationData?.categories || []).map((c: any) => (
                  <option key={c.category} value={c.category}>{c.category} ({c.units} units)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Valuation Products Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Physical Stock</th>
                    <th className="py-3 px-3 text-right">Cost Price</th>
                    <th className="py-3 px-3 text-right">Selling Price</th>
                    <th className="py-3 px-3 text-right">Total Cost Value</th>
                    <th className="py-3 px-3 text-right">Total Retail Value</th>
                    <th className="py-3 px-4 text-right">Potential Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(valuationData?.items || [])
                    .filter((p: any) => {
                      const matchSearch = p.name.toLowerCase().includes(valuationSearch.toLowerCase()) || p.sku.toLowerCase().includes(valuationSearch.toLowerCase());
                      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
                      return matchSearch && matchCat;
                    })
                    .map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{p.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{p.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-600 font-semibold">{p.category}</td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-gray-900">{p.stock}</td>
                        <td className="py-3 px-3 text-right font-mono text-gray-600">KES {p.costPrice.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-gray-900 font-semibold">KES {p.sellingPrice.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-gray-700 font-semibold">KES {p.costValue.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">KES {p.retailValue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono text-blue-600 font-black">KES {p.potentialProfit.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400 font-bold">{p.marginPct}% margin</div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEAD STOCK & SLOW-MOVING ITEMS */}
      {/* ========================================================================= */}
      {activeTab === 'deadstock' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50/70 p-4 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Dead Stock & Dormant Working Capital</h3>
                <p className="text-xs text-amber-900">
                  Products with physical stock on shelves that have recorded ZERO sales in the selected period.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Dormant Period:</span>
              <div className="flex rounded-xl border border-gray-200 bg-white p-0.5 shadow-xs">
                {['30', '60', '90'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDeadStockDays(d)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      deadStockDays === d ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {deadStockData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-rose-600 uppercase">Capital Locked in Dead Stock</div>
                <div className="text-3xl font-black text-rose-600 mt-1">
                  KES {deadStockData.summary.totalTiedUpCapital.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">Cash tied up in non-performing inventory</div>
              </div>

              <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">Total Dormant Physical Units</div>
                <div className="text-3xl font-black text-gray-900 mt-1">
                  {deadStockData.summary.totalDeadUnits.toLocaleString()} units
                </div>
                <div className="text-xs text-gray-500 mt-1">Taking up shelf space without sales</div>
              </div>

              <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-amber-600 uppercase">Dormant Product SKUs</div>
                <div className="text-3xl font-black text-amber-600 mt-1">
                  {deadStockData.summary.totalDeadProducts} SKUs
                </div>
                <div className="text-xs text-gray-500 mt-1">Require promotion or liquidation</div>
              </div>
            </div>
          )}

          {/* Dead Stock Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4">Dormant Item</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Stock</th>
                    <th className="py-3 px-3 text-right">Cost Capital Tied Up</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4">Action Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(deadStockData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-gray-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <span className="font-bold text-gray-800">Healthy Inventory!</span>
                        <p className="text-xs">No dormant items found without sales in the last {deadStockDays} days.</p>
                      </td>
                    </tr>
                  ) : (
                    deadStockData.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-600 font-semibold">{item.category}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">{item.stock}</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600 font-black">
                          KES {item.tiedUpCapital.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            item.status === 'DEAD_STOCK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status.replace('_', ' ')} ({item.daysDormant}d)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-700">
                          {item.recommendation}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TOP 20 PARETO (80/20) BESTSELLERS */}
      {/* ========================================================================= */}
      {activeTab === 'pareto' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-indigo-50/70 p-4 border border-indigo-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Pareto Principle (80/20 Rule) Bestsellers</h3>
                <p className="text-xs text-indigo-900">
                  Identify the vital ~20% of catalog items that generate 80% of your business cash flow.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Period:</span>
              <div className="flex rounded-xl border border-gray-200 bg-white p-0.5 shadow-xs">
                {[
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: '90d', label: '90 Days' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setParetoPeriod(p.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      paretoPeriod === p.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {paretoData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">Total Period Revenue</div>
                <div className="text-3xl font-black text-indigo-600 mt-1">
                  KES {paretoData.summary.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">Across {paretoData.summary.uniqueItemsSold} active products</div>
              </div>

              <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-emerald-600 uppercase">Core Star Products (80% Revenue)</div>
                <div className="text-3xl font-black text-emerald-600 mt-1">
                  {paretoData.summary.paretoCoreCount} Items
                </div>
                <div className="text-xs text-gray-500 mt-1">These items carry your business profitability</div>
              </div>

              <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-blue-600 uppercase">Inventory Priority Recommendation</div>
                <div className="text-base font-bold text-gray-800 mt-1">
                  Never Run Out of Stock
                </div>
                <div className="text-xs text-gray-500 mt-1">Keep 2x reorder buffer on Top 20 items</div>
              </div>
            </div>
          )}

          {/* Pareto Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Bestselling Item</th>
                    <th className="py-3 px-3 text-right">Units Sold</th>
                    <th className="py-3 px-3 text-right">Revenue (KES)</th>
                    <th className="py-3 px-3 text-right">Gross Profit</th>
                    <th className="py-3 px-3 text-right">Revenue Share</th>
                    <th className="py-3 px-4 text-center">Pareto Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(paretoData?.top20 || []).map((item: any) => (
                    <tr key={item.rank} className={`hover:bg-indigo-50/30 transition-colors ${item.isPareto80 ? 'bg-indigo-50/15' : ''}`}>
                      <td className="py-3 px-4 text-center font-bold text-gray-500 font-mono">
                        #{item.rank}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{item.name}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">{item.unitsSold}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-indigo-600">
                        KES {item.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        KES {item.grossProfit.toLocaleString()} ({item.marginPct}%)
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600 font-semibold">
                        {item.revenuePct}% (Cum. {item.cumulativePct}%)
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isPareto80 ? (
                          <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ★ 80% Core Star
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full">
                            Secondary 20%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PHYSICAL STOCKTAKE & VARIANCE */}
      {/* ========================================================================= */}
      {activeTab === 'stocktake' && (
        <div className="space-y-6">
          <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-600" />
                Physical Stocktake Audit Sheet
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Input physical counted units per product. Discrepancies (shrinkage or surplus) are calculated automatically.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 text-xs font-bold">
                <button
                  onClick={() => setStocktakeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${stocktakeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setStocktakeFilter('DISCREPANCIES')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${stocktakeFilter === 'DISCREPANCIES' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'}`}
                >
                  Discrepancies Only
                </button>
                <button
                  onClick={() => setStocktakeFilter('SHRINKAGE')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${stocktakeFilter === 'SHRINKAGE' ? 'bg-white text-rose-600 shadow-xs' : 'text-gray-500'}`}
                >
                  Shrinkage (Missing)
                </button>
              </div>

              <button
                onClick={handleCommitStocktake}
                disabled={isCommittingStocktake}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCommittingStocktake ? 'Committing...' : 'Commit Reconciliation'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3 text-right">System Expected</th>
                    <th className="py-3 px-3 text-center">Physical Count</th>
                    <th className="py-3 px-3 text-right">Variance Qty</th>
                    <th className="py-3 px-4 text-right">Variance Value (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStocktake.map((item: any) => {
                    const counted = item.countedStock === '' ? item.expectedStock : Number(item.countedStock);
                    const variance = counted - item.expectedStock;
                    const varianceVal = variance * item.costPrice;

                    return (
                      <tr key={item.productId} className={`hover:bg-gray-50/60 transition-colors ${variance < 0 ? 'bg-rose-50/20' : variance > 0 ? 'bg-emerald-50/20' : ''}`}>
                        <td className="py-3 px-4 font-bold text-gray-900">{item.name}</td>
                        <td className="py-3 px-3 font-mono text-xs text-gray-400">{item.sku}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">{item.expectedStock}</td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            value={item.countedStock}
                            onChange={e => handleCountChange(item.productId, e.target.value)}
                            className="w-24 text-center py-1 px-2 text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {variance > 0 ? (
                            <span className="text-emerald-600">+{variance}</span>
                          ) : variance < 0 ? (
                            <span className="text-rose-600">{variance}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black">
                          {variance !== 0 ? (
                            <span className={variance < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              KES {varianceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">KES 0.00</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CASH FLOAT & SHIFT RECONCILIATION (X / Z READ) */}
      {/* ========================================================================= */}
      {activeTab === 'cashier_shift' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Card */}
            <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Declare Shift Cash & End of Day (Z-Read)</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Cashier Shift</label>
                  <select
                    value={shiftCashier}
                    onChange={e => setShiftCashier(e.target.value)}
                    className="w-full p-2.5 text-sm font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="All Cashiers">All Cashiers Combined</option>
                    {(closingData?.cashiers || []).map((c, i) => (
                      <option key={i} value={c.name}>{c.name} (KES {c.cashTotal.toLocaleString()} cash)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Shift Opening Cash Float (KES)</label>
                  <input
                    type="number"
                    value={openingFloat}
                    onChange={e => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-sm font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="2000"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Cash placed in drawer before starting sales</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Petty Cash Payouts / Expenses (KES)</label>
                  <input
                    type="number"
                    value={pettyCashPayouts}
                    onChange={e => setPettyCashPayouts(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-sm font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Cash taken out for milk, deliveries, petty expenses</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Physical Cash Counted in Drawer (KES)</label>
                  <input
                    type="number"
                    value={countedCash}
                    onChange={e => setCountedCash(e.target.value)}
                    className="w-full p-3 text-base font-black border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="Enter physical cash counted..."
                  />
                </div>
              </div>
            </div>

            {/* Reconciliation Variance Card */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                  <span>Shift Cash Expected vs Declared</span>
                  <span className="text-xs font-mono text-slate-400">POS Audit Formula</span>
                </h3>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Opening Cash Float:</span>
                    <span className="font-bold text-white">KES {openingFloat.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">+ Cash Sales Today:</span>
                    <span className="font-bold text-emerald-400">KES {cashSalesToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">- Petty Cash Payouts:</span>
                    <span className="font-bold text-amber-400">KES {pettyCashPayouts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-b-2 border-slate-700 pb-3">
                    <span className="text-blue-400">= Total Expected Cash:</span>
                    <span className="text-blue-400">KES {expectedShiftCash.toLocaleString()}</span>
                  </div>
                </div>

                {countedCash !== '' && (
                  <div className={`mt-5 p-4 rounded-xl border text-sm font-bold flex items-center justify-between ${
                    Math.abs(cashVariance) < 0.01 
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : cashVariance < 0
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                      : 'bg-amber-950/60 border-amber-500 text-amber-300'
                  }`}>
                    <div>
                      <div className="text-xs uppercase tracking-wider opacity-80">Shift Drawer Status:</div>
                      <div className="text-base font-black">
                        {Math.abs(cashVariance) < 0.01 
                          ? 'PERFECTLY BALANCED (0.00)' 
                          : cashVariance < 0 
                          ? `CASH SHORTAGE (- KES ${Math.abs(cashVariance).toLocaleString()})`
                          : `CASH SURPLUS (+ KES ${cashVariance.toLocaleString()})`
                        }
                      </div>
                    </div>
                    {Math.abs(cashVariance) < 0.01 ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
                    )}
                  </div>
                )}
              </div>

              {closingData && (
                <button
                  onClick={() => printThermalClosingSlip(closingData)}
                  className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print 80mm Cashier Z-Slip</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: M-PESA STATEMENT RECONCILER */}
      {/* ========================================================================= */}
      {activeTab === 'mpesa_reconcile' && (
        <div className="space-y-6">
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Safaricom M-Pesa Till / Paybill Statement Reconciler</span>
            </h3>
            <p className="text-xs text-gray-500">
              Paste transaction codes or statement lines exported from Safaricom Org Portal / Till App. System automatically reconciles each code against your POS receipts.
            </p>

            <textarea
              rows={4}
              value={pastedMpesaText}
              onChange={e => setPastedMpesaText(e.target.value)}
              placeholder="Paste M-Pesa codes or lines here (e.g. UK5KZ13A22 3.00, UK5KZ12T9P 2.00, ...)"
              className="w-full p-3 text-xs font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                onClick={handleReconcileMpesa}
                disabled={isReconcilingMpesa}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isReconcilingMpesa ? 'animate-spin' : ''}`} />
                <span>{isReconcilingMpesa ? 'Reconciling...' : 'Run M-Pesa Reconciliation'}</span>
              </button>
            </div>
          </div>

          {/* Reconciliation Results */}
          {mpesaReconcileResult && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                  <div className="text-xs font-bold text-gray-500 uppercase">Statement Entries</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">
                    {mpesaReconcileResult.summary.totalStatementEntries}
                  </div>
                </div>

                <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-xs bg-emerald-50/30">
                  <div className="text-xs font-bold text-emerald-700 uppercase">Matched on POS</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {mpesaReconcileResult.summary.matchedCount}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {mpesaReconcileResult.summary.reconciliationRate}% Matched
                  </div>
                </div>

                <div className="p-4 bg-white border border-amber-200 rounded-2xl shadow-xs bg-amber-50/30">
                  <div className="text-xs font-bold text-amber-700 uppercase">Till Unrecorded on POS</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {mpesaReconcileResult.summary.unmatchedTillCount}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">Money in till, no receipt</div>
                </div>

                <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-xs bg-rose-50/30">
                  <div className="text-xs font-bold text-rose-700 uppercase">POS Sales Missing on Till</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {mpesaReconcileResult.summary.missingOnStatementCount}
                  </div>
                  <div className="text-[11px] text-rose-700 font-medium mt-1">Flagged for verification</div>
                </div>
              </div>

              {/* Matched Table */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5">
                <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Matched & Verified Transactions ({mpesaReconcileResult.matched.length})</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase">
                        <th className="py-2">Receipt Code</th>
                        <th className="py-2">POS Receipt #</th>
                        <th className="py-2 text-right">Amount (KES)</th>
                        <th className="py-2">Customer / Cashier</th>
                        <th className="py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {mpesaReconcileResult.matched.map((m: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-2 font-bold text-gray-900">{m.code}</td>
                          <td className="py-2 text-gray-600">{m.receiptNumber}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">KES {m.receiptAmount.toLocaleString()}</td>
                          <td className="py-2 text-gray-700 font-sans">{m.customerName}</td>
                          <td className="py-2 text-right">
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full font-sans">
                              VERIFIED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
