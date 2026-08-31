import { Building2, Monitor, Server, Link as LinkIcon, RefreshCw, ShieldCheck } from 'lucide-react';
import OutletsManager from '../components/Settings/OutletsManager';
import TerminalManager from '../components/Settings/TerminalManager';
import { useBranchContext } from '../context/BranchContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function OutletsDevices() {
  const { activeLocationId } = useBranchContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pairingData, setPairingData] = useState<{ pairingCode: string, apiKey: string } | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] mb-1">
            Network Management
          </div>
          <h1 className="font-heading text-2xl sm:text-[1.7rem] font-black tracking-tight text-[color:var(--text-primary)] truncate flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[color:var(--accent-primary)]" />
            Outlets & Devices
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
            Manage your physical locations and approve local POS terminals connecting to the cloud.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Active Outlets Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[color:var(--text-primary)]" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Active Outlets</h2>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <OutletsManager />
          </div>
        </section>

        {/* Local Server Pairing Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-sky-500" />
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Local Server Integration</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Securely pair a local edge node to this store location.</p>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 text-sky-500/10 pointer-events-none">
              <ShieldCheck className="w-48 h-48" />
            </div>
            
            <div className="relative z-10">
              <h3 className="font-bold text-slate-800 mb-2">Master API Node Pairing</h3>
              <p className="text-sm text-slate-600 mb-6 max-w-2xl">
                To link a Whiz Local Server appliance to this specific branch, generate a secure handshake code. 
                You will need to enter both the API Key and Pairing Code in the local server's setup wizard. 
                <span className="font-semibold text-amber-600 ml-1">The code expires in 15 minutes.</span>
              </p>
              
              {!pairingData ? (
                <button
                  onClick={generatePairingCode}
                  disabled={isGenerating || activeLocationId === 'ALL'}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  {activeLocationId === 'ALL' ? 'Select a Location First' : 'Generate Secure Handshake'}
                </button>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl animate-in slide-in-from-top-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Permanent API Key</div>
                    <div className="font-mono text-sm text-slate-800 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {pairingData.apiKey}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-sm shadow-sky-500/10">
                    <div className="text-xs font-bold text-sky-600 uppercase mb-1">Temporary Pairing Code</div>
                    <div className="font-mono text-3xl tracking-[0.25em] text-slate-900 font-black">
                      {pairingData.pairingCode}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Device Approvals Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-[color:var(--text-primary)]" />
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Pending Device Approvals</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Local POS terminals broadcasting connection requests.</p>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <TerminalManager />
          </div>
        </section>
      </div>
    </div>
  );
}



