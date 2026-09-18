import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, Users, ShoppingCart } from 'lucide-react';

const mockChartData = [
  { name: 'Mon', current: 4000, previous: 2400 },
  { name: 'Tue', current: 3000, previous: 1398 },
  { name: 'Wed', current: 2000, previous: 9800 },
  { name: 'Thu', current: 2780, previous: 3908 },
  { name: 'Fri', current: 1890, previous: 4800 },
  { name: 'Sat', current: 2390, previous: 3800 },
  { name: 'Sun', current: 3490, previous: 4300 },
];

export default function BranchPerformanceChart({ location }: { location: any }) {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    outlets: 0,
    transactions: 0,
    staff: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      if (!location?.id) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        // Fetch Summary (Revenue & Transactions)
        const summaryRes = await fetch(`${API_BASE_URL}/api/dashboard/summary?locationId=${location.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const summary = await summaryRes.json();

        // Fetch Outlets
        const outletsRes = await fetch(`${API_BASE_URL}/api/outlets/${location.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const outlets = await outletsRes.json();

        // Fetch Staff
        const staffRes = await fetch(`${API_BASE_URL}/api/dashboard/staff?locationId=${location.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const staffData = await staffRes.json();

        setMetrics({
          revenue: summary.totalSales || 0,
          transactions: summary.receiptCount || 0,
          outlets: Array.isArray(outlets) ? outlets.length : 0,
          staff: staffData.staff?.length || 0
        });
      } catch (err) {
        console.error('Error fetching real branch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [location?.id]);

  const growth = 14.5;
  const isPositive = growth > 0;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `KES ${metrics.revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Active Outlets', value: metrics.outlets.toString(), icon: Activity, color: 'text-sky-500', bg: 'bg-sky-50' },
          { label: 'Transactions', value: metrics.transactions.toString(), icon: ShoppingCart, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Staff Assigned', value: metrics.staff.toString(), icon: Users, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((metric, idx) => (
          <div key={idx} className="bg-white/60 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${metric.bg} ${metric.color}`}>
              <metric.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{metric.label}</p>
              <h4 className="text-xl font-bold text-slate-800">
                {loading ? <span className="text-slate-300">...</span> : metric.value}
              </h4>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Revenue Trend</h3>
              <p className="text-sm text-slate-500">Weekly performance overview (Mocked Series)</p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(growth)}%
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorPrev)" name="Previous Week" />
                <Area type="monotone" dataKey="current" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorCurrent)" name="Current Week" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6">
            <h3 className="font-bold text-slate-800">Peak Hours</h3>
            <p className="text-sm text-slate-500">Busiest times for {location?.name}</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="current" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
