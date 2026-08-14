import React, { useState, useEffect, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Package, Calendar, Activity, Target,
  PieChart, X, ArrowUpRight, ArrowDownRight,
  LayoutDashboard, Zap, Clock
} from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DashboardMetric {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: 'emerald' | 'rose' | 'blue' | 'amber' | 'violet';
  id: string;
}

export default function Dashboard() {
  const { transactions, products, expenses, setCurrentPage } = usePosStore();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [showPieChart, setShowPieChart] = useState(false);

  // Memoized date filter
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    const prevStart = new Date();
    const prevEnd = new Date();
    
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        prevStart.setDate(start.getDate() - 1);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setDate(start.getDate() - 1);
        prevEnd.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        prevStart.setDate(prevStart.getDate() - 14);
        prevEnd.setDate(prevEnd.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        prevStart.setMonth(prevStart.getMonth() - 2);
        prevEnd.setMonth(prevEnd.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        prevStart.setFullYear(prevStart.getFullYear() - 2);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1);
        break;
    }
    
    return { start, end: now, prevStart, prevEnd };
  }, [timeRange]);

  // Memoized metrics calculation
  const { metrics, topProducts, recentTransactions, lowStockCount, paymentStats } = useMemo(() => {
    const filteredTx = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d >= dateRange.start && d <= dateRange.end;
    });

    const prevTx = transactions.filter(t => {
      const d = new Date(t.timestamp);
      return d >= dateRange.prevStart && d <= dateRange.prevEnd;
    });

    const calcRevenue = (txs: any[]) => txs.reduce((sum, t) =>
      sum + (t.total || (t.items || []).reduce((itemSum: number, item: any) => {
        const price = item.product?.price || 0;
        return itemSum + (price * (item.quantity || 1));
      }, 0)), 0
    );

    const revenue = calcRevenue(filteredTx);
    const prevRevenue = calcRevenue(prevTx);
    
    const orders = filteredTx.length;
    const prevOrders = prevTx.length;

    const aov = orders > 0 ? revenue / orders : 0;
    const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    const customers = new Set(filteredTx.map(t => t.customerName || 'Walk-in')).size;
    const prevCustomers = new Set(prevTx.map(t => t.customerName || 'Walk-in')).size;

    const currentExpenses = expenses.filter(e => {
      const d = new Date(e.timestamp || 0);
      return d >= dateRange.start && d <= dateRange.end;
    }).reduce((sum, e) => sum + e.amount, 0);

    const profit = revenue - currentExpenses;

    // Top Products
    const productSales = new Map<string, { quantity: number; revenue: number; name: string }>();
    filteredTx.forEach(t => {
      t.items?.forEach(item => {
        if (!item.product) return;
        const id = String(item.product.id || 'unknown');
        const price = item.product.price || 0;
        const existing = productSales.get(id) || { quantity: 0, revenue: 0, name: item.product.name || 'Unknown Item' };
        productSales.set(id, {
          quantity: existing.quantity + (item.quantity || 1),
          revenue: existing.revenue + (price * (item.quantity || 1)),
          name: existing.name
        });
      });
    });

    const sortedTop = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    const dashboardMetrics: DashboardMetric[] = [
      {
        id: 'revenue',
        title: 'Total Revenue',
        value: `KES ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        change: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
        icon: <DollarSign className="w-5 h-5" />,
        color: 'emerald'
      },
      {
        id: 'orders',
        title: 'Total Orders',
        value: orders,
        change: prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : 0,
        icon: <ShoppingCart className="w-5 h-5" />,
        color: 'blue'
      },
      {
        id: 'profit',
        title: 'Net Profit',
        value: `KES ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        change: 0,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'violet'
      },
      {
        id: 'aov',
        title: 'Avg. Order Value',
        value: `KES ${aov.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        change: prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : 0,
        icon: <Target className="w-5 h-5" />,
        color: 'amber'
      },
      {
        id: 'customers',
        title: 'Unique Customers',
        value: customers,
        change: prevCustomers > 0 ? ((customers - prevCustomers) / prevCustomers) * 100 : 0,
        icon: <Users className="w-5 h-5" />,
        color: 'rose'
      }
    ];

    // Payment Method Breakdown
    const paymentStats = {
      cash: 0,
      mpesa: 0,
      card: 0,
      other: 0
    };
    filteredTx.forEach(t => {
      const amount = t.total || 0;
      const method = (t.paymentMethod || '').toLowerCase();
      if (method.includes('cash')) paymentStats.cash += amount;
      else if (method.includes('mpesa')) paymentStats.mpesa += amount;
      else if (method.includes('card')) paymentStats.card += amount;
      else paymentStats.other += amount;
    });

    const lowStockCount = products.filter(p => (p.stock !== undefined && p.stock !== null) && p.stock <= (p.minStockLevel || 5)).length;

    return {
      metrics: dashboardMetrics,
      topProducts: sortedTop,
      recentTransactions: transactions.slice(0, 10),
      paymentStats,
      lowStockCount
    };
  }, [transactions, expenses, products, dateRange]);

  const chartData = {
    labels: topProducts.slice(0, 5).map(p => p.name),
    datasets: [{
      data: topProducts.slice(0, 5).map(p => p.revenue),
      backgroundColor: [
        'rgba(16, 185, 129, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(244, 63, 94, 0.7)',
      ],
      borderColor: '#fff',
      borderWidth: 2,
    }],
  };

  const getMetricStyles = (color: DashboardMetric['color']) => {
    const styles = {
      emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    };
    return styles[color];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Modern Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
              <p className="text-slate-500 font-medium">Monitoring your business pulse in real-time</p>
            </div>
          </div>

          <div className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            {(['today', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  timeRange === range
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Feature Widget: Real-time pulse */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-blue-500/20" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Live Performance</span>
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight">Your business is <span className="text-blue-400">thriving</span> today.</h2>
              <p className="text-slate-400 max-w-md text-lg leading-relaxed">
                You've processed <span className="text-white font-bold">{metrics[1].value} orders</span> so far.
                Keep up the great momentum!
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <p className="text-slate-500 text-sm font-bold mb-1">Gross Revenue</p>
                <p className="text-2xl font-black text-white">{metrics[0].value}</p>
                <div className="flex items-center mt-2 text-emerald-400 text-sm font-bold">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {metrics[0].change.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <p className="text-slate-500 text-sm font-bold mb-1">Low Stock Alerts</p>
                <p className="text-2xl font-black text-rose-400">{lowStockCount}</p>
                <button onClick={() => setCurrentPage('inventory')} className="text-slate-400 text-sm mt-2 font-bold hover:text-white transition-colors underline decoration-dashed underline-offset-4">View Inventory</button>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods Breakdown */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 mb-6">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Revenue by Payment Method</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-500">Cash</span>
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><DollarSign className="w-5 h-5"/></div>
                </div>
                <p className="text-2xl font-black text-slate-900">KES {paymentStats.cash.toLocaleString()}</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-500">M-Pesa</span>
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1024px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" className="h-5 object-contain" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">KES {paymentStats.mpesa.toLocaleString()}</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-500">Card</span>
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Target className="w-5 h-5"/></div>
                </div>
                <p className="text-2xl font-black text-slate-900">KES {paymentStats.card.toLocaleString()}</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-500">Other</span>
                  <div className="p-2 bg-slate-200 rounded-lg text-slate-600"><PieChart className="w-5 h-5"/></div>
                </div>
                <p className="text-2xl font-black text-slate-900">KES {paymentStats.other.toLocaleString()}</p>
             </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {metrics.map((metric, idx) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${getMetricStyles(metric.color)} transition-transform group-hover:scale-110`}>
                  {metric.icon}
                </div>
                {metric.change !== 0 && (
                  <div className={`flex items-center px-2 py-1 rounded-lg text-xs font-black ${
                    metric.change > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {metric.change > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                    {Math.abs(metric.change).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-slate-500 font-bold text-sm mb-1">{metric.title}</p>
              <h3 className="text-2xl font-black text-slate-900 truncate">{metric.value}</h3>
            </motion.div>
          ))}
        </section>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recent Activity */}
          <section className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
              </div>
              <button
                onClick={() => setCurrentPage('reports')}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Audit Log
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {tx.paymentMethod.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{tx.customerName || 'Walk-in Customer'}</p>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">KES {tx.total.toLocaleString()}</p>
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                        tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Product Performance */}
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <PieChart className="w-6 h-6 text-violet-600" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Best Sellers</h3>
              </div>
              <button onClick={() => setShowPieChart(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Activity className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {topProducts.slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 flex items-center justify-center text-xs font-black text-slate-400 bg-slate-100 rounded-lg">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.quantity} Units</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">KES {p.revenue.toLocaleString()}</p>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(p.revenue / topProducts[0].revenue) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Actions Container */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">Lightning Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Process Sale', icon: <DollarSign />, page: 'pos', color: 'blue' },
              { label: 'Restock', icon: <Package />, page: 'inventory', color: 'emerald' },
              { label: 'Reports', icon: <Activity />, page: 'reports', color: 'violet' },
              { label: 'Settings', icon: <Zap />, page: 'settings', color: 'slate' }
            ].map((action) => (
              <button
                key={action.page}
                onClick={() => setCurrentPage(action.page as any)}
                className="flex items-center space-x-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 border border-slate-200"
              >
                <div className={`p-2 rounded-lg bg-white shadow-sm text-${action.color}-600`}>
                  {action.icon}
                </div>
                <span className="font-bold text-slate-700">{action.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Pie Chart Modal */}
      <AnimatePresence>
        {showPieChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowPieChart(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPieChart(false)}
                className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
              >
                <X className="w-8 h-8" />
              </button>

              <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Revenue Breakdown</h3>

              <div className="aspect-square w-full max-w-sm mx-auto">
                <Pie data={chartData} options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { weight: 'bold', family: 'sans-serif' }
                      }
                    }
                  }
                }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
