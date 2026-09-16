import { useState, useEffect } from 'react';
import { Search, Eye, PowerOff, Building2, Play } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function AdminTenants() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch('/api/admin/businesses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.businesses);
      } else {
        toast.error('Failed to load tenants');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const toggleSuspend = async (businessId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'reactivate' : 'suspend'} this account?`)) return;
    
    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch(`/api/admin/businesses/${businessId}/suspend`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suspend: !currentStatus })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchTenants(); // Refresh
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (e) {
      toast.error('Error suspending account');
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                <th className="px-6 py-4 font-semibold tracking-wider hidden md:table-cell">Users</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading tenants...</td></tr>
              ) : filteredTenants.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No businesses found.</td></tr>
              ) : filteredTenants.map(t => {
                const settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : (t.settings || {});
                const isSuspended = !!settings.isSuspended;
                const statusStr = isSuspended ? 'Suspended' : 'Active';

                return (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          {t.logoUrl ? <img src={t.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" /> : <Building2 className="w-5 h-5 text-slate-300" />}
                        </div>
                        <div>
                          <div className="text-white font-bold">{t.name}</div>
                          <div className="text-xs text-slate-400">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-700 text-slate-300">
                        Free
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${!isSuspended ? 'text-emerald-400' : 'text-[#FF2A55]'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${!isSuspended ? 'bg-emerald-400' : 'bg-[#FF2A55]'}`} />
                        {statusStr}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden md:table-cell">{t.users?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-[#8A55FF]/20 hover:text-[#8A55FF] text-slate-400 transition-colors" title="Ghost Mode (Login as this business)">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleSuspend(t.id, isSuspended)}
                          className={`p-2 rounded-lg bg-white/5 transition-colors ${
                            isSuspended 
                              ? 'hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400' 
                              : 'hover:bg-[#FF2A55]/20 hover:text-[#FF2A55] text-slate-400'
                          }`} 
                          title={isSuspended ? "Reactivate Account" : "Suspend Account"}
                        >
                          {isSuspended ? <Play className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
