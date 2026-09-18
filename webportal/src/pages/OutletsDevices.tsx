import { Copy, Building2, Monitor, Server, Link as LinkIcon, RefreshCw, ShieldCheck } from 'lucide-react';
import OutletsManager from '../components/Settings/OutletsManager';
import LocationManager from '../components/Settings/LocationManager';
import TerminalManager from '../components/Settings/TerminalManager';
import BranchPerformanceChart from '../components/Settings/BranchPerformanceChart';
import { useBranchContext } from '../context/BranchContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function OutletsDevices() {
  const { activeLocationId, setActiveLocationId, locations } = useBranchContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pairingData, setPairingData] = useState<{ pairingCode: string, apiKey: string } | null>(null);

  const activeLocation = locations.find((l: any) => l.id === activeLocationId);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(type + ' copied to clipboard!');
  };

  const generatePairingCode = async () => {
    if (!activeLocationId || activeLocationId === 'ALL') {
      toast.error('Please select a specific location from the top dropdown first.');
      return;
    }
    
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/auth/generate-pairing-code`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locationId: activeLocationId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPairingData({ pairingCode: data.pairingCode, apiKey: data.apiKey });
        toast.success('Pairing code generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate code');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  // VIEW 1: MASTER LIST (ALL BRANCHES)
  if (!activeLocationId || activeLocationId === 'ALL') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] mb-1">
              Global Overview
            </div>
            <h1 className="font-heading text-2xl sm:text-[1.7rem] font-black tracking-tight text-[color:var(--text-primary)] truncate flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[color:var(--accent-primary)]" />
              Branch Management
            </h1>
            <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
              Select a branch below to manage its local servers, active POS outlets, and device approvals.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <LocationManager />
        </div>
      </div>
    );
  }

  // VIEW 2: BRANCH DRILL-DOWN (SPECIFIC BRANCH SELECTED)
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 p-6">
      
      {/* Back Button and Header */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={() => {
            setActiveLocationId('ALL');
            setPairingData(null);
          }}
          className="w-fit flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sky-600 transition-colors bg-white/60 backdrop-blur px-4 py-2 rounded-xl border border-white shadow-sm hover:shadow-md"
        >
          &larr; Back to all branches
        </button>
        
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] mb-1">
            Managing Network For
          </div>
          <h1 className="font-heading text-2xl sm:text-[1.7rem] font-black tracking-tight text-sky-600 truncate flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {activeLocation?.name || 'Selected Branch'}
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
            Overview, server integrations, and POS terminals linked to this branch.
          </p>
        </div>
      </div>

      <div className="space-y-8">

        {/* Branch Performance Overview (New Charts) */}
        <section>
          <BranchPerformanceChart location={activeLocation} />
        </section>

        {/* Local Server Pairing Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-sky-500" />
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Local Server Edge Node</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Connect a local server to handle offline sync for this branch.</p>
            </div>
          </div>
          
          <div className={`glass-panel p-6 rounded-3xl border relative overflow-hidden transition-all ${activeLocation?.apiKey ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_8px_30px_rgba(16,185,129,0.1)]' : 'border-sky-500/20 bg-sky-500/5 shadow-[0_8px_30px_rgba(14,165,233,0.1)]'}`}>
            <div className={`absolute -right-10 -top-10 pointer-events-none ${activeLocation?.apiKey ? 'text-emerald-500/10' : 'text-sky-500/10'}`}>
              <ShieldCheck className="w-48 h-48" />
            </div>
            
            <div className="relative z-10">
              {activeLocation?.apiKey && !pairingData ? (
                 <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-xl">Server Connected</h3>
                      </div>
                      <p className="text-sm text-slate-600 max-w-lg mb-4">
                        A local server is currently paired to this branch. It is handling offline transactions and routing data to the cloud. You can link multiple server nodes using the same API key.
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-slate-200">
                           <span className="text-slate-500 font-semibold mr-2">Last Sync:</span> 
                           <span className="text-slate-800 font-mono">Just now</span>
                        </div>
                        <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-slate-200">
                           <span className="text-slate-500 font-semibold mr-2">API Key:</span> 
                           <span className="text-slate-800 font-mono">••••••••{activeLocation.apiKey.slice(-4)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <button 
                        className="bg-white text-slate-700 hover:text-sky-600 font-bold py-2.5 px-6 rounded-xl border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2" 
                        onClick={generatePairingCode}
                        disabled={isGenerating}
                      >
                         {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                         Link Another Server
                      </button>
                      <button className="bg-white text-red-500 hover:bg-red-50 font-bold py-2.5 px-6 rounded-xl border border-red-100 shadow-sm transition-all">
                         Unlink All Servers
                      </button>
                    </div>
                 </div>
              ) : (
                 <div>
                    <h3 className="font-bold text-slate-800 mb-2">
                      {activeLocation?.apiKey ? 'Link Additional Server Node' : 'Master API Node Pairing'}
                    </h3>
                    <p className="text-sm text-slate-600 mb-6 max-w-2xl">
                      To link a Whiz Local Server appliance to this specific branch, generate a secure handshake code. 
                      You will need to enter both the API Key and Pairing Code in the local server's setup wizard. 
                      <span className="font-semibold text-amber-600 ml-1">The pairing code expires in 15 minutes.</span>
                    </p>
                    
                    {!pairingData ? (
                      <button
                        onClick={generatePairingCode}
                        disabled={isGenerating}
                        className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-sky-500/20"
                      >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                        Generate Secure Handshake for this Server
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl animate-in slide-in-from-top-4">
                          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-bold text-slate-500 uppercase">Permanent API Key</div>
                              <button onClick={() => handleCopy(pairingData.apiKey, 'API Key')} className="text-sky-500 hover:text-sky-600 bg-sky-50 hover:bg-sky-100 p-1.5 rounded-lg transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="font-mono text-sm text-slate-800 break-all bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 mt-2">
                              {pairingData.apiKey}
                            </div>
                          </div>
                          <div className="bg-white/80 p-4 rounded-2xl border border-sky-200 shadow-sm shadow-sky-500/10 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-bold text-sky-600 uppercase">Temporary Pairing Code</div>
                              <button onClick={() => handleCopy(pairingData.pairingCode, 'Pairing Code')} className="text-sky-500 hover:text-sky-600 bg-sky-50 hover:bg-sky-100 p-1.5 rounded-lg transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="font-mono text-4xl tracking-[0.25em] text-slate-900 font-black mt-2">
                              {pairingData.pairingCode}
                            </div>
                          </div>
                        </div>
                        
                        {activeLocation?.apiKey && (
                           <button 
                             onClick={() => setPairingData(null)}
                             className="text-sm text-slate-500 hover:text-sky-600 font-semibold"
                           >
                             &larr; Back to Connected Server Dashboard
                           </button>
                        )}
                      </div>
                    )}
                 </div>
              )}
            </div>
          </div>
        </section>

        {/* Active Outlets Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[color:var(--text-primary)]" />
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Branch Outlets</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Manage the sub-departments that belong to this local server.</p>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-3xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <OutletsManager />
          </div>
        </section>

        {/* Device Approvals Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-[color:var(--text-primary)]" />
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Pending Device Approvals</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Approve local POS terminals broadcasting to this server.</p>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-3xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <TerminalManager />
          </div>
        </section>
      </div>
    </div>
  );
}



