import { useState, useEffect } from 'react';
import { Search, Eye, PowerOff, Building2, Play, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminTenants() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [suspendModal, setSuspendModal] = useState<{ isOpen: boolean, businessId: string | null, isSuspended: boolean }>({ isOpen: false, businessId: null, isSuspended: false });
  const [wipeModal, setWipeModal] = useState<{ isOpen: boolean, businessId: string | null, businessName: string }>({ isOpen: false, businessId: null, businessName: '' });

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

  const confirmToggleSuspend = async () => {
    const { businessId, isSuspended } = suspendModal;
    if (!businessId) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch(`/api/admin/businesses/${businessId}/suspend`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suspend: !isSuspended })
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
    } finally {
      setSuspendModal({ isOpen: false, businessId: null, isSuspended: false });
    }
  };

  const impersonateTenant = async (businessId: string, businessName: string) => {
    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch(`/api/admin/businesses/${businessId}/impersonate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('whiz-token', data.token);
        localStorage.setItem('whiz-user', JSON.stringify(data.user));
        toast.success(`Ghost Mode Activated: ${businessName}`, { icon: '👻' });
        window.location.href = '/dashboard';
      } else {
        toast.error(data.error || 'Ghost mode failed');
      }
    } catch (e) {
      toast.error('Network error triggering Ghost mode');
    }
  };

  const remoteWipeTenant = async () => {
    const { businessId } = wipeModal;
    if (!businessId) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Remote Wipe successful. Data securely destroyed.', { icon: '🔥' });
        fetchTenants(); // Refresh
      } else {
        toast.error(data.error || 'Remote Wipe failed');
      }
    } catch (e) {
      toast.error('Network error during Remote Wipe');
    } finally {
      setWipeModal({ isOpen: false, businessId: null, businessName: '' });
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Tenant Directory</h1>
        <p className="text-slate-400 text-sm mt-1">Manage, suspend, or assist registered businesses.</p>
      </div>

      <div className="bg-white/[0.05] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search businesses (Cmd+K)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase bg-black/40 text-slate-400 border-b border-white/5 tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Business</th>
                <th className="px-6 py-4 hidden sm:table-cell">Tier</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 hidden md:table-cell">Users</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading tenants...</td></tr>
              ) : filteredTenants.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No businesses found.</td></tr>
              ) : filteredTenants.map(t => {
                const settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : (t.settings || {});
                const isSuspended = !!settings.isSuspended;
                const statusStr = isSuspended ? 'Suspended' : 'Active';

                return (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                          {t.logoUrl ? <img src={t.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : <Building2 className="w-5 h-5 text-slate-300" />}
                        </div>
                        <div>
                          <div className="text-white font-bold">{t.name}</div>
                          <div className="text-[11px] text-slate-400">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/5">
                        Free
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${!isSuspended ? 'text-emerald-400' : 'text-[#FF2A55]'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${!isSuspended ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-[#FF2A55] shadow-[0_0_8px_rgba(255,42,85,0.8)]'}`} />
                        {statusStr}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden md:table-cell font-medium">{t.users?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                        <button 
                          onClick={() => impersonateTenant(t.id, t.name)}
                          className="p-2 rounded-xl bg-white/10 hover:bg-[#8A55FF]/20 hover:text-[#8A55FF] text-slate-300 transition-colors border border-white/5" 
                          title="Ghost Mode (Login as this business)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setSuspendModal({ isOpen: true, businessId: t.id, isSuspended })}
                          className={`p-2 rounded-xl border transition-colors ${
                            isSuspended 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
                          }`} 
                          title={isSuspended ? "Reactivate Account" : "Suspend Account"}
                        >
                          {isSuspended ? <Play className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => setWipeModal({ isOpen: true, businessId: t.id, businessName: t.name })}
                          className="p-2 rounded-xl bg-[#FF2A55]/10 border border-[#FF2A55]/20 text-[#FF2A55] hover:bg-[#FF2A55]/20 transition-colors" 
                          title="Remote Wipe (Delete Business)"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Suspend Confirmation Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSuspendModal({ isOpen: false, businessId: null, isSuspended: false })} />
          <div className="relative bg-[#0F1714] border border-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.5)] rounded-3xl w-full max-w-sm p-6 overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${suspendModal.isSuspended ? 'bg-emerald-500' : 'bg-[#FF2A55]'}`} />
            
            <div className="flex flex-col items-center text-center mt-4 mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${suspendModal.isSuspended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#FF2A55]/20 text-[#FF2A55]'}`}>
                {suspendModal.isSuspended ? <Play className="w-8 h-8 ml-1" /> : <AlertTriangle className="w-8 h-8" />}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-2">
                {suspendModal.isSuspended ? 'Reactivate Account?' : 'Suspend Account?'}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {suspendModal.isSuspended 
                  ? 'This business will immediately regain access to their dashboard, API, and services.'
                  : 'This business will be immediately disconnected. They will not be able to log in or use the API until reactivated.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setSuspendModal({ isOpen: false, businessId: null, isSuspended: false })}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={confirmToggleSuspend}
                className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${
                  suspendModal.isSuspended 
                    ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' 
                    : 'bg-[#FF2A55] hover:bg-[#FF3B66] shadow-[#FF2A55]/20'
                }`}
              >
                {suspendModal.isSuspended ? 'Yes, Reactivate' : 'Yes, Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote Wipe Confirmation Modal */}
      {wipeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWipeModal({ isOpen: false, businessId: null, businessName: '' })} />
          <div className="relative bg-[#0F1714] border border-red-500/30 shadow-[0_16px_64px_rgba(255,42,85,0.2)] rounded-3xl w-full max-w-sm p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FF2A55]" />
            
            <div className="flex flex-col items-center text-center mt-4 mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#FF2A55]/20 text-[#FF2A55] animate-pulse">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-2">
                Remote Wipe {wipeModal.businessName}?
              </h2>
              <p className="text-sm text-[#FF2A55] font-bold mb-2">
                WARNING: THIS ACTION CANNOT BE UNDONE
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                This will permanently delete the business, all its users, inventory, customers, and data. Are you absolutely sure?
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setWipeModal({ isOpen: false, businessId: null, businessName: '' })}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={remoteWipeTenant}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-lg hover:-translate-y-0.5 active:translate-y-0 bg-[#FF2A55] hover:bg-[#FF3B66] shadow-[#FF2A55]/20"
              >
                Yes, Wipe It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
