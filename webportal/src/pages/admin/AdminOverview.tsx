import React from 'react';
import { TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Platform Pulse</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time metrics across all WhizPOS tenants.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium bg-[#00F0FF]/10 text-[#00F0FF] px-3 py-1.5 rounded-full border border-[#00F0FF]/20 self-start sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F0FF]"></span>
          </span>
          System Operational
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Platform GMV" 
          value="KSh 14.2M" 
          trend="+12%" 
          icon={<TrendingUp className="text-[#00F0FF] w-5 h-5" />} 
        />
        <MetricCard 
          title="Active Businesses" 
          value="1,204" 
          trend="+3" 
          icon={<Users className="text-[#8A55FF] w-5 h-5" />} 
        />
        <MetricCard 
          title="Current Online Users" 
          value="892" 
          trend="Live" 
          icon={<Activity className="text-emerald-400 w-5 h-5" />} 
        />
        <MetricCard 
          title="At-Risk Accounts" 
          value="12" 
          trend="-2" 
          trendNegative 
          icon={<AlertTriangle className="text-[#FF2A55] w-5 h-5" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Placeholder Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 h-80 flex flex-col">
          <h3 className="text-white font-bold mb-4">Transaction Volume (30 Days)</h3>
          <div className="flex-1 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-500 text-sm bg-black/20">
            [ Area Chart Rendering Here ]
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-80 flex flex-col">
          <h3 className="text-white font-bold mb-4">Live Activity</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 items-start border-b border-white/5 pb-3 last:border-0">
                <div className="w-2 h-2 rounded-full bg-[#00F0FF] mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-300">Aden Cafe processed <span className="text-white font-medium">KSh 12,000</span></p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{i} minute{i > 1 ? 's' : ''} ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, icon, trendNegative }: { title: string, value: string, trend: string, icon: React.ReactNode, trendNegative?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${trendNegative ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-white text-2xl font-black mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
