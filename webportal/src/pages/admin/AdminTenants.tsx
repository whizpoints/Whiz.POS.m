import { useState } from 'react';
import { Search, Eye, PowerOff, Building2 } from 'lucide-react';

export default function AdminTenants() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dummy data for phase 1
  const tenants = [
    { id: '1', name: 'Aden Cafe', owner: 'josphat@whizpoint.app', tier: 'Pro', status: 'Active', lastSync: '2 mins ago' },
    { id: '2', name: 'Kagwe Retail', owner: 'admin@kagwe.com', tier: 'Free', status: 'Active', lastSync: '1 hr ago' },
    { id: '3', name: 'Stolen POS Test', owner: 'test@example.com', tier: 'Pro', status: 'Suspended', lastSync: '5 days ago' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Tenant Directory</h1>
        <p className="text-slate-400 text-sm mt-1">Manage, suspend, or assist registered businesses.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search businesses (Cmd+K)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Business</th>
                <th className="px-6 py-4 font-semibold tracking-wider hidden sm:table-cell">Tier</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider hidden md:table-cell">Last Sync</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-slate-300" />
                      </div>
                      <div>
                        <div className="text-white font-bold">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.owner}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${t.tier === 'Pro' ? 'bg-[#8A55FF]/20 text-[#8A55FF] border border-[#8A55FF]/30' : 'bg-slate-700 text-slate-300'}`}>
                      {t.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${t.status === 'Active' ? 'text-emerald-400' : 'text-[#FF2A55]'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Active' ? 'bg-emerald-400' : 'bg-[#FF2A55]'}`} />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 hidden md:table-cell">{t.lastSync}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-[#8A55FF]/20 hover:text-[#8A55FF] text-slate-400 transition-colors" title="Ghost Mode (Login as this business)">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 hover:bg-[#FF2A55]/20 hover:text-[#FF2A55] text-slate-400 transition-colors" title="Suspend/Halt Account">
                        <PowerOff className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
