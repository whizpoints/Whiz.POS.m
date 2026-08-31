import { FileBarChart, Download, TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useBranchContext } from '../context/BranchContext';

import { useState, useEffect } from 'react';

export default function Reports() {
  const [data, setData] = useState<any[]>([
    { name: 'Mon', sales: 0, profit: 0 },
    { name: 'Tue', sales: 0, profit: 0 },
    { name: 'Wed', sales: 0, profit: 0 },
    { name: 'Thu', sales: 0, profit: 0 },
    { name: 'Fri', sales: 0, profit: 0 },
    { name: 'Sat', sales: 0, profit: 0 },
    { name: 'Sun', sales: 0, profit: 0 },
  ]);
  const [stats, setStats] = useState({
    revenue: 0, revenueDelta: 0, profit: 0, profitDelta: 0, transactions: 0, transactionsDelta: 0
  });
  const [_loading, setLoading] = useState(true);
  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
        const response = await fetch(`${API_BASE_URL}/api/dashboard/reports${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.chartData) setData(resData.chartData);
          if (resData.stats) setStats(resData.stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [activeLocationId]);
  return (
    <div className="space-y-5 px-4 py-4 md:p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[color:var(--text-primary)]">Reports & Analytics</h1>
          <p className="text-[color:var(--text-secondary)]">Z-reports, P&L, inventory forecasting and insights.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Calendar className="w-4 h-4" /> This Week
          </button>
          <button className="btn btn-primary">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Total Revenue</div>
          <div className="text-3xl font-black text-[color:var(--text-primary)] mb-2">KES {stats.revenue.toLocaleString()}</div>
          <div className={`flex items-center gap-1 text-sm ${stats.revenueDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <TrendingUp className={`w-4 h-4 ${stats.revenueDelta < 0 && 'rotate-180'}`} /> {stats.revenueDelta > 0 ? '+' : ''}{stats.revenueDelta}% from last week
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Total Profit</div>
          <div className="text-3xl font-black text-[color:var(--text-primary)] mb-2">KES {stats.profit.toLocaleString()}</div>
          <div className={`flex items-center gap-1 text-sm ${stats.profitDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <TrendingUp className={`w-4 h-4 ${stats.profitDelta < 0 && 'rotate-180'}`} /> {stats.profitDelta > 0 ? '+' : ''}{stats.profitDelta}% from last week
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">Transactions</div>
          <div className="text-3xl font-black text-[color:var(--text-primary)] mb-2">{stats.transactions.toLocaleString()}</div>
          <div className={`flex items-center gap-1 text-sm ${stats.transactionsDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <TrendingUp className={`w-4 h-4 ${stats.transactionsDelta < 0 && 'rotate-180'}`} /> {stats.transactionsDelta > 0 ? '+' : ''}{stats.transactionsDelta}% from last week
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="glass-panel p-5">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-[color:var(--accent-primary)]" />
            Revenue vs Profit
          </h3>
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

