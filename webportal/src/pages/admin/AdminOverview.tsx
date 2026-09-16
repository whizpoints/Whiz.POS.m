import React from 'react';
import { DollarSign, Users, ShoppingCart, Activity, Search, Bell, Sun } from 'lucide-react';

export default function AdminOverview() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Dashboard Overview</h1>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search anything..."
              className="bg-white/5 border border-white/5 rounded-full pl-11 pr-6 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:bg-white/10 transition-colors w-64"
            />
          </div>
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF7F50] border-2 border-[#0A100D]" />
          </button>
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <Sun className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="TOTAL REVENUE" 
          value="$84,254" 
          trend="+12.5%" 
          trendUp={true}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />} 
        />
        <MetricCard 
          title="ACTIVE USERS" 
          value="24,521" 
          trend="+8.2%" 
          trendUp={true}
          icon={<Users className="w-5 h-5 text-orange-400" />} 
        />
        <MetricCard 
          title="TOTAL ORDERS" 
          value="8,461" 
          trend="-3.1%" 
          trendUp={false}
          icon={<ShoppingCart className="w-5 h-5 text-rose-400" />} 
        />
        <MetricCard 
          title="CONVERSION RATE" 
          value="324%" 
          trend="+2.4%" 
          trendUp={true}
          icon={<Activity className="w-5 h-5 text-emerald-400" />} 
          glowColor="rgba(16,185,129,0.2)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/5 rounded-[24px] p-8 backdrop-blur-md">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-white font-bold text-lg">Revenue Analytics</h3>
              <p className="text-slate-400 text-sm mt-1">Monthly revenue overview</p>
            </div>
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
              <button className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-white/10 border border-white/10">Monthly</button>
              <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors">Weekly</button>
              <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors">Daily</button>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-3 justify-between">
            {/* Fake Chart Bars with pastel colors */}
            {[45, 60, 30, 55, 75, 50, 70, 55, 85, 50, 70, 75].map((h, i) => {
              const colors = ['bg-[#88DFB4]', 'bg-[#F4C588]', 'bg-[#E39695]', 'bg-[#6CC7C3]'];
              return (
                <div key={i} className="w-full relative group h-full flex items-end">
                  <div 
                    className={`w-full rounded-md ${colors[i % colors.length]} opacity-80 group-hover:opacity-100 transition-opacity`} 
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mt-4 px-2">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-8 backdrop-blur-md">
          <h3 className="text-white font-bold text-lg mb-1">Recent Activity</h3>
          <p className="text-slate-400 text-sm mb-8">Latest transactions</p>
          
          <div className="space-y-6">
            <ActivityItem 
              initials="JD" 
              color="bg-[#10B981]" 
              title="John Doe purchased Premium Plan" 
              time="2 minutes ago" 
            />
            <ActivityItem 
              initials="AS" 
              color="bg-[#F59E0B]" 
              title="Anna Smith submitted a support ticket" 
              time="15 minutes ago" 
            />
            <ActivityItem 
              initials="MJ" 
              color="bg-[#F43F5E]" 
              title="Mike Johnson upgraded subscription" 
              time="1 hour ago" 
            />
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-8 backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-white font-bold text-lg">Recent Transactions</h3>
            <p className="text-slate-400 text-sm mt-1">Latest orders and payments</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">View All</button>
            <button className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="pb-4 font-semibold">Customer</th>
                <th className="pb-4 font-semibold">Product</th>
                <th className="pb-4 font-semibold">Date</th>
                <th className="pb-4 font-semibold">Status</th>
                <th className="pb-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-white/5">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">JD</div>
                    <div>
                      <div className="text-white font-semibold">John Doe</div>
                      <div className="text-[11px] text-slate-500">john@example.com</div>
                    </div>
                  </div>
                </td>
                <td className="py-4">Premium Plan</td>
                <td className="py-4 text-slate-400">Jan 15, 2025</td>
                <td className="py-4">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Completed
                  </span>
                </td>
                <td className="py-4 text-right text-white font-bold">$299.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendUp, icon, glowColor }: { title: string, value: string, trend: string, trendUp: boolean, icon: React.ReactNode, glowColor?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-6 relative overflow-hidden backdrop-blur-md group">
      {glowColor && (
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full mix-blend-screen filter blur-[40px] opacity-50 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: glowColor }} />
      )}
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
          {icon}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-white text-[32px] font-bold tracking-tight leading-none mb-4">{value}</p>
        <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-bold ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ initials, color, title, time }: { initials: string, color: string, title: string, time: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-lg`}>
        {initials}
      </div>
      <div>
        <p className="text-slate-200 text-sm font-medium leading-snug mb-1">{title}</p>
        <p className="text-[11px] text-slate-500">{time}</p>
      </div>
    </div>
  );
}
