import { useConfirm } from '../context/ConfirmContext';
import { useState, useEffect, type ReactNode } from 'react';
import {
  Key, Copy, CheckCircle2, CreditCard, ShieldCheck, AlertTriangle,
  RefreshCw, Eye, EyeOff, Save, Building2, Globe, Lock, User2, Mail,
  Bell, Palette, Database, Download, Trash2, ChevronRight, Link,
  Upload, HardDrive, Clock, ExternalLink, ArrowRight, Check, Sparkles, Folder
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../lib/utils';


type Tab = 'profile' | 'security' | 'payments' | 'etims' | 'email' | 'backup';

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'profile', label: 'Business Profile', icon: <Building2 className="w-4 h-4" /> },
  { id: 'security', label: 'Server Link (API)', icon: <Key className="w-4 h-4" /> },
  { id: 'payments', label: 'Payment Methods', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'etims', label: 'eTIMS KRA', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'email', label: 'Email Configuration', icon: <Mail className="w-4 h-4" /> },
  { id: 'backup', label: 'Backup & Restore', icon: <Database className="w-4 h-4" /> }
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/business/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        try {
          if (typeof data.settings === 'string') data.settings = JSON.parse(data.settings);
          if (typeof data.settings === 'string') data.settings = JSON.parse(data.settings);
        } catch(e) {}
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const updateProfileSettings = async (updates: any) => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/business/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ settings: { ...profile?.settings, ...updates } })
      });
      if (res.ok) {
        fetchProfile();
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[color:var(--text-muted)]">Loading settings...</div>;
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mx-0.5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] mb-1">
            Configuration
          </div>
          <h1 className="font-heading text-2xl sm:text-[1.7rem] font-black tracking-tight text-[color:var(--text-primary)] truncate">
            System Settings
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
            Manage API keys, payment integrations, compliance, and business identity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn btn-secondary !px-3 inline-flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" />
            Export Config
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-strong rounded-2xl p-1.5 flex gap-1 overflow-x-auto -mx-0.5">
        {tabs.map(t => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                active ? 'text-white shadow-md' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]'
              }`}
              style={active ? { background: 'var(--accent-gradient)', boxShadow: '0 8px 24px -10px color-mix(in oklab, var(--accent) 60%, transparent)' } : {}}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="space-y-4">
        {tab === 'security' && <SecurityPanel profile={profile} fetchProfile={fetchProfile} />}
        {tab === 'payments' && <PaymentsPanel />}
        {tab === 'etims' && <ETimsPanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'profile' && <ProfilePanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'email' && <EmailPanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'backup' && <BackupPanel />}
      </div>
    </div>
  );
}

/* --------------------------- Security --------------------------- */

function CopyField({ value, mono = true }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex items-center gap-2">
      <div
        className={`input flex-1 h-10 !pr-2.5 items-center inline-flex overflow-hidden ${mono ? 'font-mono text-[13px]' : 'text-sm'}`}
        style={mono ? { letterSpacing: '0.2px' } : {}}
      >
        <span className="truncate text-[color:var(--text-primary)]">{value}</span>
      </div>
      <button
        onClick={copy}
        className="btn btn-secondary !w-10 !h-10 !px-0 inline-flex items-center justify-center shrink-0"
        aria-label="Copy value"
      >
        {copied
          ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
          : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ApiKeyRow({ label, keyStr, status, badge }: { label: string; keyStr: string; status: 'live' | 'test' | 'revoked'; badge: string }) {
  return (
    <div className="glass-subtle rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 25%, transparent), color-mix(in oklab, var(--accent-secondary) 22%, transparent))' }}>
            <Key className="w-4.5 h-4.5 text-[color:var(--accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[color:var(--text-primary)] truncate">{label}</div>
            <div className="text-[11px] text-[color:var(--text-muted)] font-mono">Created Mar 12, 2025 • Last used 2h ago</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`badge badge-${status === 'live' ? 'success' : status === 'test' ? 'info' : 'error'}`}>{badge}</span>
          <button className="btn btn-ghost !w-9 !h-9 !p-0 inline-flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]" title="Rotate">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn btn-ghost !w-9 !h-9 !p-0 inline-flex items-center justify-center text-[color:var(--text-muted)] hover:text-red-500" title="Revoke">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <CopyField value={keyStr} />
    </div>
  );
}

function SecurityPanel({ profile, fetchProfile }: any) {
  const isAlreadyLinked = !!(profile?.settings?.backOfficeApiKey && (profile?.settings?.cloudLocationId || profile?.settings?.cloudLocationName));

  const [url, setUrl] = useState(profile?.settings?.backOfficeUrl || 'https://api.whizpoint.app');
  const [apiKey, setApiKey] = useState(profile?.settings?.backOfficeApiKey || '');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingMode, setPairingMode] = useState<'browser' | 'manual'>('browser');
  const [step, setStep] = useState<'input' | 'pairing' | 'linked'>(isAlreadyLinked ? 'linked' : 'input');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [testingSync, setTestingSync] = useState(false);
  const [error, setError] = useState('');
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);
  const { confirm } = useConfirm();

  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  useEffect(() => {
    if (isAlreadyLinked) {
      setStep('linked');
    }
  }, [isAlreadyLinked]);

  const handleLinkAccount = async () => {
    setIsVerifying(true);
    setError('');
    try {
      const cleanUrl = (url || 'https://api.whizpoint.app').replace(/\/+$/, '');
      
      const res = await fetch(`${cleanUrl}/api/pairing/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'SERVER', 
          deviceInfo: { 
            platform: navigator.platform, 
            hostname: window.location.hostname,
            appName: 'WhizPOS Local Server'
          } 
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to generate link request`);
      }

      const data = await res.json();
      const connectUrl = `${cleanUrl}/connect/server/${data.requestId}`;
      setApprovalUrl(connectUrl);
      
      // Poll cloud status every 2.5 seconds
      const pId = setInterval(() => checkCloudApproval(cleanUrl, data.requestId, pId), 2500);
      setPollIntervalId(pId);
      
      setStep('pairing');
      toast.success('Pairing session initiated! Please approve in the cloud portal.');

      if ((window as any).electron && (window as any).electron.openExternal) {
        (window as any).electron.openExternal(connectUrl);
      } else {
        window.open(connectUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Link account error:', err);
      setError(err.message || 'Cloud connection failed. Ensure you have internet.');
      toast.error(err.message || 'Failed to initiate cloud pairing');
    } finally {
      setIsVerifying(false);
    }
  };

  const checkCloudApproval = async (cloudApi: string, requestId: string, intervalId: any) => {
    try {
      const res = await fetch(`${cloudApi}/api/pairing/${requestId}/status`);
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.status === 'APPROVED' && data.credentials) {
        clearInterval(intervalId);
        
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = getApiBaseUrl();

        // 1. Save locally via settings/save
        const saveRes = await fetch(`${API_BASE_URL}/api/settings/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            backOfficeUrl: cloudApi,
            apiKey: data.credentials.apiKey,
            cloudBusinessId: data.credentials.businessId,
            syncMode: 'AUTO_REALTIME',
            outletId: data.credentials.outletId,
            serverId: data.credentials.serverId,
            cloudBusinessName: data.credentials.businessName,
            cloudLocationName: data.credentials.locationName
          })
        }).catch(() => null);

        if (saveRes && saveRes.ok) {
          const saveData = await saveRes.json().catch(() => ({}));
          if (saveData.newToken) {
            localStorage.setItem('whiz-token', saveData.newToken);
          }
        }

        // 2. Save into Business profile settings
        await fetch(`${API_BASE_URL}/api/business/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            settings: {
              ...profile?.settings,
              backOfficeUrl: cloudApi,
              backOfficeApiKey: data.credentials.apiKey,
              cloudBusinessId: data.credentials.businessId,
              cloudLocationId: data.credentials.outletId,
              cloudBusinessName: data.credentials.businessName,
              cloudLocationName: data.credentials.locationName,
              linkedAt: new Date().toISOString()
            }
          })
        }).catch(() => {});

        toast.success(`Server linked to "${data.credentials.locationName}"!`);
        setTimeout(() => window.location.reload(), 1500);
      } else if (data.status === 'EXPIRED') {
        clearInterval(intervalId);
        setError('Pairing session timed out. Please initiate a new link.');
        setStep('input');
      }
    } catch (err) {}
  };

  const handleValidatePairing = async () => {
    if (!apiKey.trim()) {
      return toast.error('Please enter your Permanent API Key');
    }
    if (pairingCode.trim().length !== 6) {
      return toast.error('Pairing code must be 6 digits');
    }

    setIsConfirming(true);
    setError('');
    try {
      const cleanUrl = (url || 'https://api.whizpoint.app').replace(/\/+$/, '');
      
      const res = await fetch(`${cleanUrl}/api/auth/validate-pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), pairingCode: pairingCode.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid or expired Pairing Code. Check Back Office Outlets.');
        setIsConfirming(false);
        return;
      }

      const confirmRes = await fetch(`${cleanUrl}/api/auth/confirm-pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), pairingCode: pairingCode.trim() })
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.success) {
        setError(confirmData.error || 'Pairing handshake failed. Please try again.');
        setIsConfirming(false);
        return;
      }

      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();

      // Save locally
      const saveRes = await fetch(`${API_BASE_URL}/api/settings/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          backOfficeUrl: cleanUrl,
          apiKey: apiKey.trim(),
          cloudBusinessId: data.businessId,
          syncMode: 'AUTO_REALTIME',
          outletId: confirmData.outletId || data.locationId,
          serverId: confirmData.serverId,
          cloudBusinessName: data.businessName,
          cloudLocationName: data.locationName
        })
      }).catch(() => null);

      if (saveRes && saveRes.ok) {
        const saveData = await saveRes.json().catch(() => ({}));
        if (saveData.newToken) {
          localStorage.setItem('whiz-token', saveData.newToken);
        }
      }

      await fetch(`${API_BASE_URL}/api/business/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          settings: {
            ...profile?.settings,
            backOfficeUrl: cleanUrl,
            backOfficeApiKey: apiKey.trim(),
            cloudBusinessId: data.businessId,
            cloudLocationId: data.locationId,
            cloudBusinessName: data.businessName,
            cloudLocationName: data.locationName,
            linkedAt: new Date().toISOString()
          }
        })
      });

      toast.success(`Server linked to "${data.locationName}" (${data.businessName})!`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Network error linking server');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleTestSync = async () => {
    setTestingSync(true);
    try {
      const cleanUrl = (profile?.settings?.backOfficeUrl || url || 'https://api.whizpoint.app').replace(/\/+$/, '');
      const keyToUse = profile?.settings?.backOfficeApiKey || apiKey;
      const start = Date.now();
      const res = await fetch(`${cleanUrl}/api/business/locations`, {
        headers: { 'Authorization': `Bearer ${keyToUse}` }
      });
      const ms = Date.now() - start;
      if (res.ok) {
        toast.success(`Cloud link operational (${ms}ms latency)`, { duration: 4000 });
      } else {
        toast.error(`Cloud returned status ${res.status}`);
      }
    } catch (err) {
      toast.error('Could not reach cloud backoffice');
    } finally {
      setTestingSync(false);
    }
  };

  const handleUnlink = async () => {
    const ok = await confirm({
      title: 'Unlink Local Server?',
      message: 'Are you sure you want to unlink this server from the cloud? Cloud synchronization will stop immediately until re-paired.',
      confirmText: 'Yes, Unlink Server'
    });
    if (!ok) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      await fetch(`${API_BASE_URL}/api/business/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          settings: {
            ...profile?.settings,
            backOfficeApiKey: null,
            cloudBusinessId: null,
            cloudLocationId: null,
            cloudBusinessName: null,
            cloudLocationName: null,
            linkedAt: null
          }
        })
      });

      setStep('input');
      setApiKey('');
      setPairingCode('');
      fetchProfile();
      toast.success('Server unlinked successfully');
    } catch (err) {
      toast.error('Failed to unlink server');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Cloud Synchronization"
        title="Server Cloud Link"
        description="Connect this local server appliance with WhizPOS Cloud to enable live multi-branch inventory, remote analytics, and automated cloud backups."
        icon={<Globe className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.18))"
      />

      {/* STATE 1: ALREADY LINKED */}
      {step === 'linked' && (
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  Server Connected & Synchronized
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time two-way synchronization active between local POS terminals and cloud back office.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTestSync}
                disabled={testingSync}
                className="btn btn-secondary !px-3 !py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingSync ? 'animate-spin' : ''}`} />
                Test Latency
              </button>
              <button
                onClick={handleUnlink}
                className="btn btn-ghost text-red-500 hover:bg-red-50 !px-3 !py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Unlink Server
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Branch</div>
              <div className="text-sm font-bold text-slate-800 truncate">
                {profile?.settings?.cloudLocationName || 'Main Store'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Business</div>
              <div className="text-sm font-bold text-slate-800 truncate">
                {profile?.settings?.cloudBusinessName || profile?.name || 'WhizPOS Business'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Node Identifier</div>
              <div className="text-xs font-mono font-bold text-sky-600 truncate">
                SVR-{String(profile?.settings?.backOfficeApiKey || apiKey || 'NODE').slice(0, 8).toUpperCase()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cloud Endpoint</div>
              <div className="text-xs font-mono text-slate-600 truncate">
                {profile?.settings?.backOfficeUrl || url}
              </div>
            </div>
          </div>

          <div className="bg-white/60 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                <Key className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">Permanent Server API Token</div>
                <div className="text-xs font-mono text-slate-400">
                  ••••••••••••••••••••••••••••••••{String(profile?.settings?.backOfficeApiKey || apiKey).slice(-6)}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile?.settings?.backOfficeApiKey || apiKey);
                toast.success('API Key copied to clipboard');
              }}
              className="btn btn-secondary !px-3 !py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Key
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: WAITING FOR APPROVAL */}
      {step === 'pairing' && (
        <div className="glass-panel p-8 rounded-3xl border border-sky-500/20 bg-sky-500/5 shadow-xl flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto">
          <div className="relative">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center animate-pulse">
              <Globe className="w-8 h-8 text-sky-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
              <Clock className="w-3 h-3 text-white" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Cloud Authorization In Progress</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Please approve this local server in the WhizPOS Cloud Back Office to complete pairing.
            </p>
          </div>

          <div className="w-full bg-white/80 p-4 rounded-2xl border border-sky-100 shadow-sm space-y-3">
            <div className="text-xs text-slate-500 font-medium">Click the button below if the approval window did not open:</div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {approvalUrl && (
                <>
                  <a
                    href={approvalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary inline-flex items-center justify-center gap-2 text-sm !py-2.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Cloud Approval Screen
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(approvalUrl);
                      toast.success('Approval link copied to clipboard');
                    }}
                    className="btn btn-secondary inline-flex items-center justify-center gap-2 text-sm !py-2.5"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/60 px-4 py-2 rounded-full border border-slate-200">
            <RefreshCw className="w-3.5 h-3.5 text-sky-500 animate-spin" />
            <span>Listening for cloud authorization confirmation (polls every 2.5s)...</span>
          </div>

          <button
            onClick={() => {
              if (pollIntervalId) clearInterval(pollIntervalId);
              setStep('input');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
          >
            Cancel and Return to Options
          </button>
        </div>
      )}

      {/* STATE 3: INPUT / NOT LINKED */}
      {step === 'input' && (
        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="flex p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 max-w-md gap-1">
            <button
              onClick={() => setPairingMode('browser')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                pairingMode === 'browser'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              1-Click Cloud Pairing
            </button>
            <button
              onClick={() => setPairingMode('manual')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                pairingMode === 'manual'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Enter Pairing Code
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Pairing Failed</div>
                <div className="text-xs mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* MODE A: 1-Click Browser Pairing */}
          {pairingMode === 'browser' && (
            <div className="glass-panel p-8 rounded-3xl border border-sky-500/20 bg-gradient-to-b from-sky-50/50 to-white shadow-sm space-y-6 max-w-2xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Automatic Browser Handshake</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connects directly to your logged-in WhizPOS Cloud account without manually typing long cryptographic keys.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cloud Backoffice Endpoint URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="input w-full font-mono text-xs"
                  placeholder="https://api.whizpoint.app"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLinkAccount}
                  disabled={isVerifying}
                  className="btn btn-primary w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 text-sm"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting to Cloud...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      Link WhizPOS Cloud Account
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE B: Manual 6-Digit Pairing Code */}
          {pairingMode === 'manual' && (
            <div className="glass-panel p-8 rounded-3xl border border-slate-200/80 bg-white shadow-sm space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Enter Back Office Pairing Credentials</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Obtain these credentials from your Cloud Web Portal under <strong>Outlets & Devices → Local Server Edge Node</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cloud Endpoint
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="input w-full font-mono text-xs"
                    placeholder="https://api.whizpoint.app"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Permanent API Key
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="input w-full font-mono text-xs"
                    placeholder="Paste your 64-character server API key"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    6-Digit Temporary Pairing Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pairingCode}
                    onChange={e => setPairingCode(e.target.value.replace(/\D/g, ''))}
                    className="input w-full font-mono text-2xl font-black tracking-[0.3em] text-center"
                    placeholder="000000"
                  />
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    Pairing code expires 15 minutes after generation in the Web Portal.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleValidatePairing}
                  disabled={isConfirming || pairingCode.length !== 6 || !apiKey.trim()}
                  className="btn btn-primary w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg text-sm disabled:opacity-50"
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying Handshake...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verify & Connect Server
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentsPanel() {
  const [showConsumer, setShowConsumer] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Extract businessId from token
  const token = localStorage.getItem('whiz-token');
  let businessId = 'default-business-id';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      businessId = payload.businessId || 'default-business-id';
    }
  } catch (e) {}

  const [config, setConfig] = useState({
    merchantType: 'BUY_GOODS',
    tillNumber: '',
    paybillNumber: '',
    accountReference: '',
    shortcode: '',
    environment: 'production',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    stkEnabled: true,
    c2bEnabled: true
  });

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const API_BASE_URL = getApiBaseUrl();
        const res = await fetch(`${API_BASE_URL}/api/settings/mpesa?businessId=${businessId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setConfig({
              merchantType: data.merchantType || 'BUY_GOODS',
              tillNumber: data.tillNumber || '',
              paybillNumber: data.paybillNumber || '',
              accountReference: data.accountReference || '',
              shortcode: data.shortcode || '',
              environment: data.environment || 'production',
              consumerKey: data.consumerKey || '',
              consumerSecret: data.consumerSecret || '',
              passkey: data.passkey || '',
              stkEnabled: data.stkEnabled ?? true,
              c2bEnabled: data.c2bEnabled ?? true
            });
          }
        }
      } catch (err) {
        console.error('Failed to load M-Pesa config', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/settings/mpesa?businessId=${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success('M-Pesa configuration saved successfully!');
      } else {
        toast.error('Failed to save M-Pesa configuration.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterC2b = async () => {
    setIsRegistering(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/mpesa/c2b/v1/registerurl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ businessId })
      });
      if (res.ok) {
        toast.success('C2B URLs Registered Successfully!');
      } else {
        toast.error('Failed to register C2B URLs.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error registering C2B URLs.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const baseUrl = getApiBaseUrl();

  return (
    <>
      <SectionHeader
        eyebrow="Payments"
        title="M-Pesa Daraja Credentials"
        description="Configure Safaricom API keys to enable STK push, reversals, and automatic payment verification."
        icon={<CreditCard className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.16))"
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Merchant Type</label>
                <div className="relative">
                  <select name="merchantType" value={config.merchantType} onChange={handleChange} className="input appearance-none">
                    <option value="BUY_GOODS">Buy Goods / Till</option>
                    <option value="PAYBILL">PayBill</option>
                  </select>
                </div>
              </div>

              {config.merchantType === 'BUY_GOODS' && (
                <div className="sm:col-span-2">
                  <label className="label">Till Number</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                    <input type="text" name="tillNumber" value={config.tillNumber} onChange={handleChange} className="input !pl-10 font-mono tabular-nums" placeholder="123456" />
                  </div>
                </div>
              )}

              {config.merchantType === 'PAYBILL' && (
                <>
                  <div>
                    <label className="label">PayBill Number</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                      <input type="text" name="paybillNumber" value={config.paybillNumber} onChange={handleChange} className="input !pl-10 font-mono tabular-nums" placeholder="654321" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Account Reference</label>
                    <div className="relative">
                      <input type="text" name="accountReference" value={config.accountReference} onChange={handleChange} className="input font-mono" placeholder="Store Name / Auto" />
                    </div>
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="label">M-Pesa Shortcode (Daraja Identifier)</label>
                <div className="relative">
                  <input type="text" name="shortcode" value={config.shortcode} onChange={handleChange} className="input font-mono tabular-nums" placeholder="Enter shortcode (Till or Paybill)" />
                </div>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">The active shortcode for Daraja OAuth signatures and callbacks.</p>
              </div>

              <div>
                <label className="label">Environment</label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <select name="environment" value={config.environment} onChange={handleChange} className="input !pl-10 appearance-none pr-9">
                    <option value="production">Production (Live)</option>
                    <option value="sandbox">Sandbox (Test)</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Consumer Key</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                    <input
                      name="consumerKey"
                      value={config.consumerKey}
                      onChange={handleChange}
                      type={showConsumer ? 'text' : 'password'}
                      className="input !pl-10 !pr-10 font-mono text-[13px]"
                      placeholder="Enter Consumer Key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConsumer(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      {showConsumer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Consumer Secret</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                    <input
                      name="consumerSecret"
                      value={config.consumerSecret}
                      onChange={handleChange}
                      type={showSecret ? 'text' : 'password'}
                      className="input !pl-10 !pr-10 font-mono text-[13px]"
                      placeholder="Enter Consumer Secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Passkey (For STK Push)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                    <input
                      name="passkey"
                      value={config.passkey}
                      onChange={handleChange}
                      type={showPasskey ? 'text' : 'password'}
                      className="input !pl-10 !pr-10 font-mono text-[13px]"
                      placeholder="Enter Passkey"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasskey(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 mt-4">
                <h3 className="font-medium text-sm text-[color:var(--text-primary)] mb-2">Features</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="stkEnabled" checked={config.stkEnabled} onChange={handleChange} className="w-4 h-4 text-green-500 rounded focus:ring-green-500" />
                  <span className="text-sm text-[color:var(--text-primary)]">STK Push Enabled</span>
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" name="c2bEnabled" checked={config.c2bEnabled} onChange={handleChange} className="w-4 h-4 text-green-500 rounded focus:ring-green-500" />
                  <span className="text-sm text-[color:var(--text-primary)]">C2B Callbacks Enabled</span>
                </label>
              </div>

              <div className="sm:col-span-2 mt-6 pt-6 border-t border-[color:var(--border-subtle)]">
                <h3 className="font-medium text-sm text-[color:var(--text-primary)] mb-4">Callback Configuration (Dynamic)</h3>
                
                <label className="label">STK Callback</label>
                <CopyField value={`${baseUrl}/api/callbacks/payments/callback/stk/${businessId}`} />
                
                <label className="label mt-4">C2B Confirmation</label>
                <CopyField value={`${baseUrl}/api/callbacks/payments/callback/c2b/confirmation/${businessId}`} />
                
                <label className="label mt-4">C2B Validation</label>
                <CopyField value={`${baseUrl}/api/callbacks/payments/callback/c2b/validation/${businessId}`} />
                
                <p className="mt-2 text-[11.5px] text-[color:var(--text-muted)] leading-relaxed">
                  These URLs are uniquely generated for your business tenant.
                </p>
                <button 
                  onClick={handleRegisterC2b} 
                  disabled={isRegistering || !config.c2bEnabled} 
                  className="mt-3 btn btn-secondary text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  {isRegistering ? 'Registering...' : 'Register C2B URLs with Safaricom'}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <div className="flex gap-2 justify-end ml-auto">
                <button disabled={isSaving} onClick={handleSave} className="btn btn-primary text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* --------------------------- eTIMS --------------------------- */

function ETimsPanel({ profile, onSave }: any) {
  const [formData, setFormData] = useState({
    etimsPin: profile?.settings?.etimsPin || '',
    etimsBranch: profile?.settings?.etimsBranchId || profile?.settings?.etimsBranch || '',
    etimsSerial: profile?.settings?.etimsDeviceSerial || profile?.settings?.etimsSerial || '',
    etimsUrl: profile?.settings?.etimsUrl || '',
    etimsToken: profile?.settings?.etimsToken || '',
    etimsAutoRetry: profile?.settings?.etimsAutoRetry ?? true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <>
      <SectionHeader
        eyebrow="Compliance"
        title="KRA eTIMS VSDC Setup"
        description="Upload your VSDC device credentials to enable automatic electronic tax invoice signing."
        icon={<ShieldCheck className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.16))"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Business KRA PIN</label>
              <input type="text" name="etimsPin" value={formData.etimsPin} onChange={handleChange} className="input font-mono uppercase" placeholder="A000000000X" />
            </div>
            <div>
              <label className="label">Branch / Outlet ID</label>
              <input type="text" name="etimsBranch" value={formData.etimsBranch} onChange={handleChange} className="input" placeholder="e.g. BR-001" />
            </div>
            <div>
              <label className="label">VSDC Device Serial</label>
              <input type="text" name="etimsSerial" value={formData.etimsSerial} onChange={handleChange} className="input font-mono" placeholder="VSDC-XXXXXX" />
            </div>
            <div>
              <label className="label">Control Unit URL</label>
              <input type="url" name="etimsUrl" value={formData.etimsUrl} onChange={handleChange} className="input text-[13px]" placeholder="https://cu.etims.go.ke/..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">VSDC Auth Token</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input type="password" name="etimsToken" value={formData.etimsToken} onChange={handleChange} className="input !pl-10 font-mono" placeholder="••••••••••••••••" />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-secondary)] select-none cursor-pointer">
              <input type="checkbox" name="etimsAutoRetry" checked={formData.etimsAutoRetry} onChange={handleChange} className="w-4 h-4 rounded border-[color:var(--border-default)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]" />
              Auto-retry failed signings (max 3 attempts)
            </label>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary text-sm inline-flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Ping Control Unit
              </button>
              <button onClick={() => onSave(formData)} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
                <Save className="w-4 h-4" />
                Activate eTIMS
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(16,185,129,0.16)' }}>
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="text-sm font-semibold text-[color:var(--text-primary)]">Signing online</div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <StatRow label="Signed today" value="184" accent />
              <StatRow label="Failed (retrying)" value="2" />
              <StatRow label="Last CU ping" value="68 ms" />
              <StatRow label="eTIMS version" value="v3.2.1" />
            </div>
          </div>

          <div className="glass-subtle rounded-2xl p-4 text-[12.5px] leading-relaxed text-[color:var(--text-secondary)]">
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-[color:var(--text-primary)]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Reminder
            </div>
            KRA requires signed copies of every receipt available for 7 years. Whiz POS archives them to encrypted object storage automatically.
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------- Profile --------------------------- */

function ProfilePanel({ profile, onSave }: any) {
  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.logoUrl || null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    legalName: profile?.settings?.legalName || profile?.name || '',
    tradeName: profile?.settings?.tradeName || '',
    phone: profile?.settings?.phone || '',
    email: profile?.settings?.email || '',
    address: profile?.settings?.address || '',
    currency: profile?.settings?.currency || 'KES',
    timezone: profile?.settings?.timezone || 'Africa/Nairobi',
    receiptFooterNote: profile?.settings?.receiptFooterNote || '',
    servedBy: profile?.settings?.servedBy || '',
    mpesaPaybill: profile?.settings?.mpesaPaybill || '',
    accountNumber: profile?.settings?.accountNumber || '',
    tillNumber: profile?.settings?.tillNumber || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('logo', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/business/logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogoUrl(data.business.logoUrl);
        toast.success('Logo uploaded successfully!');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (err) {
      toast.error('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="Identity"
        title="Business Profile"
        description="This information appears on receipts, reports, and customer-facing documents."
        icon={<Building2 className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(56,189,248,0.25), rgba(59,130,246,0.16))"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Legal Business Name</label>
              <input type="text" name="legalName" value={formData.legalName} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">Trade Name (on receipts)</label>
              <input type="text" name="tradeName" value={formData.tradeName} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input font-mono tabular-nums" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Physical Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className="textarea min-h-[80px]" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange} className="input appearance-none pr-9">
                <option value="KES">Kenyan Shilling (KSh)</option>
                <option value="UGX">Ugandan Shilling</option>
                <option value="TZS">Tanzanian Shilling</option>
                <option value="USD">US Dollar</option>
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select name="timezone" value={formData.timezone} onChange={handleChange} className="input appearance-none pr-9">
                <option value="Africa/Nairobi">Nairobi (GMT+3)</option>
                <option value="Africa/Kampala">Kampala (GMT+3)</option>
                <option value="Africa/Dar_es_Salaam">Dar es Salaam (GMT+3)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={() => onSave(formData)} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              Save Profile
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass-card rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-2.5">Receipt Branding</div>
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0 overflow-hidden"
                   style={{ background: 'var(--accent-gradient)' }}>
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : 'WS'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[color:var(--text-primary)] truncate">Logo Preview</div>
                <div className="text-[11px] text-[color:var(--text-muted)]">PNG or JPG, max 512×512px</div>
              </div>
              <label className="btn btn-secondary text-xs !px-3 cursor-pointer">
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} disabled={uploading} />
              </label>
            </div>
            <label className="label !text-[11px] !mb-1.5">Receipt Footer Note</label>
            <textarea name="receiptFooterNote" value={formData.receiptFooterNote} onChange={handleChange} className="textarea min-h-[64px] !text-xs" />
            
            <label className="label !text-[11px] !mb-1.5 mt-3">Served By (Default Cashier Name)</label>
            <input type="text" name="servedBy" value={formData.servedBy} onChange={handleChange} className="input !text-xs" placeholder="e.g. Counter 1" />
            
            <div className="mt-4 border-t border-[color:var(--border-default)] pt-4">
               <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-3">Receipt Payment Details</h4>
               
               <label className="label !text-[11px] !mb-1.5">M-Pesa Paybill</label>
               <input type="text" name="mpesaPaybill" value={formData.mpesaPaybill} onChange={handleChange} className="input !text-xs mb-3" placeholder="e.g. 123456" />
               
               <label className="label !text-[11px] !mb-1.5">Account Number</label>
               <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="input !text-xs mb-3" placeholder="e.g. Shop1" />
               
               <label className="label !text-[11px] !mb-1.5">Till Number</label>
               <input type="text" name="tillNumber" value={formData.tillNumber} onChange={handleChange} className="input !text-xs" placeholder="e.g. 987654" />
            </div>
          </div>

          <div className="glass-subtle rounded-2xl p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Palette className="w-4 h-4 text-[color:var(--accent)]" />
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Theme hint</div>
            </div>
            <p className="text-[12.5px] text-[color:var(--text-secondary)] leading-relaxed">
              The portal already adapts to your system light/dark preference. Override it anytime from the sun/moon toggle in the topbar.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------- Notifications --------------------------- */

function NotificationsPanel({ profile, onSave }: any) {
  const [formData, setFormData] = useState({
    alertLowStock: profile?.settings?.alertLowStock ?? true,
    alertPayment: profile?.settings?.alertPayment ?? true,
    alertEtimsError: profile?.settings?.alertEtimsError ?? true,
    alertDailyZReport: profile?.settings?.alertDailyZReport ?? true,
    alertStaffLogin: profile?.settings?.alertStaffLogin ?? false,
    alertWeeklyBrief: profile?.settings?.alertWeeklyBrief ?? false
  });

  const rows = [
    { key: 'alertLowStock', label: 'Low stock alerts', hint: 'Notify me when any SKU drops below its reorder level.' },
    { key: 'alertPayment', label: 'Payment failures', hint: 'STK push timeouts, declined cards, and reversals.' },
    { key: 'alertEtimsError', label: 'eTIMS signing errors', hint: 'Receipts that failed to push to KRA after all retries.' },
    { key: 'alertDailyZReport', label: 'Daily Z-Report digest', hint: 'End-of-day summary emailed at close of business.' },
    { key: 'alertStaffLogin', label: 'Staff login anomalies', hint: 'Failed attempts or logins from new locations.' },
    { key: 'alertWeeklyBrief', label: 'Weekly performance brief', hint: 'Comparison to last week\'s top-line metrics.' }
  ];

  const handleToggle = (key: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <>
      <SectionHeader
        eyebrow="Alerts"
        title="Notification Preferences"
        description="Pick the events you want delivered via email, in-app toast, and SMS."
        icon={<Bell className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(244,114,182,0.22), rgba(251,146,60,0.16))"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-2.5 divide-y divide-[color:var(--border-subtle)] lg:col-span-2">
          {rows.map((r) => (
            <label key={r.key} className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-colors hover:bg-[color:var(--bg-subtle)]">
              <input
                type="checkbox"
                checked={(formData as any)[r.key]}
                onChange={(e) => handleToggle(r.key, e.target.checked)}
                className="mt-0.5 w-4.5 h-4.5 rounded border-[color:var(--border-default)] text-[color:var(--accent)] focus:ring-[color:var(--accent)] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[color:var(--text-primary)]">{r.label}</div>
                <div className="text-xs text-[color:var(--text-secondary)] leading-relaxed mt-0.5">{r.hint}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ChannelChip icon="📩" active={(formData as any)[r.key]} />
                <ChannelChip icon="🔔" active={(formData as any)[r.key]} />
                <ChannelChip icon="💬" active={false} />
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div className="glass-card rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-[color:var(--accent)]" />
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Channels</div>
            </div>
            <ChannelRow icon="📩" name="Email" value={profile?.settings?.email || "admin@whizretail.co.ke"} />
            <ChannelRow icon="💬" name="SMS (Twilio)" value={profile?.settings?.phone || "+254 712 345 678"} muted />
            <ChannelRow icon="🔔" name="In-app" value="All staff with Admin role" />
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={() => onSave(formData)} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------- Shared primitives --------------------------- */

function SectionHeader({
  eyebrow, title, description, icon, gradient
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mx-0.5">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-[color:var(--accent)]"
             style={{ background: gradient }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">{eyebrow}</div>
          <h2 className="font-heading text-xl font-black tracking-tight text-[color:var(--text-primary)] mt-0.5">{title}</h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[color:var(--text-muted)]">{label}</span>
      <span className={`font-semibold tabular-nums ${accent ? 'text-[color:var(--accent)]' : 'text-[color:var(--text-primary)]'}`}>{value}</span>
    </div>
  );
}

function ChannelChip({ icon, active }: { icon: string; active: boolean }) {
  return (
    <span
      className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs transition-all border ${
        active
          ? 'bg-[color:var(--accent)]/10 border-[color:var(--accent)]/30'
          : 'bg-[color:var(--bg-subtle)] border-transparent opacity-50 grayscale'
      }`}
    >
      {icon}
    </span>
  );
}

function ChannelRow({ icon, name, value, muted }: { icon: string; name: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="w-7 h-7 shrink-0 rounded-lg inline-flex items-center justify-center text-sm"
            style={{ background: 'color:var(--bg-subtle)' }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[color:var(--text-primary)]">{name}</div>
        <div className={`text-[11.5px] truncate ${muted ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--text-secondary)]'}`}>
          {value}
          {muted && <span className="ml-1 text-[10px] uppercase tracking-wider text-amber-500">(unverified)</span>}
        </div>
      </div>
    </div>
  );
}

function BackupPanel() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringFileName, setRestoringFileName] = useState<string | null>(null);
  const [backupDir, setBackupDir] = useState('C:\\ProgramData\\whiz-pos\\Backups\\Server');
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const { confirm } = useConfirm();

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/backup/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBackups(data.backups || []);
          if (data.backupDir) setBackupDir(data.backupDir);
        }
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Encrypted backup created (${(data.size / 1024).toFixed(1)} KB)`);
        fetchBackups();
      } else {
        toast.error(data.error || 'Failed to create backup');
      }
    } catch (err) {
      toast.error('Network error creating backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (fileName: string) => {
    const ok = await confirm({
      title: 'Restore System Database?',
      message: `Are you sure you want to restore "${fileName}"? This will overwrite the local server database with this snapshot. The application will restart automatically.`,
      confirmText: 'Yes, Restore Snapshot'
    });
    if (!ok) return;

    setRestoringFileName(fileName);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Database restored successfully! Restarting local server...', { duration: 5000 });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(data.error || 'Restore failed');
      }
    } catch (err) {
      toast.error('Error executing restore');
    } finally {
      setRestoringFileName(null);
    }
  };

  const handleManualUpload = async () => {
    if (!manualFile) return toast.error('Please select a .whizbak file');
    if (!manualFile.name.toLowerCase().endsWith('.whizbak')) {
      return toast.error('Only encrypted .whizbak files are allowed');
    }
    const ok = await confirm({
      title: 'Restore Uploaded Backup?',
      message: `Are you sure you want to restore "${manualFile.name}"? This will overwrite current server data with the contents of this archive.`,
      confirmText: 'Yes, Restore Uploaded Backup'
    });
    if (!ok) return;

    setUploadingManual(true);
    try {
      const formData = new FormData();
      formData.append('file', manualFile);

      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/backup/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('External backup restored! Restarting local server...', { duration: 5000 });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(data.error || 'Failed to restore backup');
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploadingManual(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: any) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Data Protection & Recovery"
        title="Automated Backups & Restore"
        description="Encrypted WHIZBAK2 snapshots are automatically stored on the local server every 15 minutes. Restore any snapshot with one click."
        icon={<Database className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(59,130,246,0.18))"
      />

      {/* Top Action & Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Available Snapshots</div>
            <div className="text-2xl font-black text-slate-800">{backups.length}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Automated 7-Day Retention</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Storage Folder</div>
            <div className="text-xs font-mono font-bold text-slate-700 truncate max-w-[200px]" title={backupDir}>
              .../Backups/Server
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">ProgramData Secured</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Folder className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 shadow-sm flex flex-col justify-center gap-2">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="btn btn-primary w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Snapshotting Database...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Take Backup Now
              </>
            )}
          </button>
          <div className="text-[10px] text-center text-slate-500 font-medium">
            Immediate encrypted snapshot of SQLite & assets
          </div>
        </div>
      </div>

      {/* Main Snapshots List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Local Server Backup Vault</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any restore point below to recover settings, products, inventory counts, and sales.
            </p>
          </div>
          <button
            onClick={fetchBackups}
            className="btn btn-ghost !p-2 text-slate-400 hover:text-slate-700"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
            <span className="text-xs">Scanning backup vault...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
            <Database className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Backup Snapshots Found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click &quot;Take Backup Now&quot; above to create your first encrypted database snapshot.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto pr-1">
            {backups.map((b: any) => {
              const isRestoring = restoringFileName === b.fileName;
              return (
                <div
                  key={b.fileName}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                      <Database className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate" title={b.fileName}>
                        {b.fileName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(b.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono">{formatFileSize(b.size)}</span>
                        <span>•</span>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-[10px] border border-emerald-100">
                          WHIZBAK2 Encrypted
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`${getApiBaseUrl()}/api/backup/download/${encodeURIComponent(b.fileName)}?apiKey=${encodeURIComponent(localStorage.getItem('whiz-token') || '')}`}
                      download={b.fileName}
                      className="btn btn-secondary !px-3 !py-1.5 text-xs inline-flex items-center gap-1.5"
                      title="Download backup file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Save</span>
                    </a>

                    <button
                      onClick={() => handleRestore(b.fileName)}
                      disabled={isRestoring || !!restoringFileName}
                      className="btn btn-primary !bg-emerald-600 hover:!bg-emerald-500 !px-4 !py-1.5 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Restore Database
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible: Manual External File Import */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
        <button
          onClick={() => setShowManualUpload(prev => !prev)}
          className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-400" />
            Advanced: Restore from External .whizbak Archive (USB / Manual)
          </span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showManualUpload ? 'rotate-90' : ''}`} />
        </button>

        {showManualUpload && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <p className="text-xs text-slate-500">
              Select an external encrypted <code>.whizbak</code> file from another machine to import its catalog and database into this server.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <input
                type="file"
                accept=".whizbak"
                onChange={e => setManualFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
              <button
                onClick={handleManualUpload}
                disabled={!manualFile || uploadingManual}
                className="btn btn-secondary !py-2 !px-4 text-xs font-bold shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {uploadingManual ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Upload & Restore
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailPanel({ profile, onSave }: any) {
  const [formData, setFormData] = useState({
    emailEnabled: profile?.settings?.emailEnabled || false,
    emailFrom: profile?.settings?.emailFrom || profile?.settings?.email || '',
    emailReplyTo: profile?.settings?.emailReplyTo || profile?.settings?.email || '',
    emailAppPassword: profile?.settings?.emailAppPassword || ''
  });
  const [isTesting, setIsTesting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleTestEmail = async () => {
    if (!formData.emailAppPassword) {
       toast.error("Please save your App Password first before testing.");
       return;
    }
    setIsTesting(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/email/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Test email sent successfully!');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      toast.error('Network error while testing email');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-[color:var(--border-color)]">
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Email Configuration</h2>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">Configure your Google Workspace or Gmail account to send receipts and invoices directly from WhizPOS.</p>
      </div>
      
      <div className="p-4 md:p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 text-sm">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Important: 2-Step Verification Required</p>
              <p className="mb-2">To use a Gmail account, you must enable 2-Step Verification on your Google account and generate an <strong>App Password</strong>.</p>
              <ol className="list-decimal pl-5 space-y-1 text-xs">
                <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Account Security page</a></li>
                <li>Enable 2-Step Verification if not already on</li>
                <li>Go to App Passwords (or search "App Passwords")</li>
                <li>Create a new password named "WhizPOS"</li>
                <li>Copy the 16-character password and paste it below</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-w-xl">
          <label className="flex items-center space-x-3 cursor-pointer p-4 border border-[color:var(--border-color)] rounded-lg hover:bg-[color:var(--bg-tertiary)] transition-colors">
            <input 
              type="checkbox" 
              name="emailEnabled" 
              checked={formData.emailEnabled} 
              onChange={handleChange}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="font-semibold text-[color:var(--text-primary)]">Enable Email Sending</p>
              <p className="text-sm text-[color:var(--text-secondary)]">Allow WhizPOS to send emails to customers</p>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-1">Email From</label>
              <input
                type="email"
                name="emailFrom"
                value={formData.emailFrom}
                onChange={handleChange}
                placeholder="sales@yourbusiness.com"
                className="w-full border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-1">Reply-To Address</label>
              <input
                type="email"
                name="emailReplyTo"
                value={formData.emailReplyTo}
                onChange={handleChange}
                placeholder="sales@yourbusiness.com"
                className="w-full border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-1">Google App Password</label>
            <div className="relative">
              <input
                type="password"
                name="emailAppPassword"
                value={formData.emailAppPassword}
                onChange={handleChange}
                placeholder={formData.emailAppPassword === '��������' ? '��������' : '16-character app password'}
                className="w-full border border-[color:var(--border-color)] rounded-lg px-3 py-2 pr-10 text-sm bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            </div>
            <p className="text-xs text-[color:var(--text-secondary)] mt-1">
              Your password is encrypted and stored securely. We never expose it.
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-[color:var(--bg-tertiary)] border-t border-[color:var(--border-color)] flex justify-between items-center">
        <button
          onClick={handleTestEmail}
          disabled={isTesting || !formData.emailEnabled}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50 flex items-center"
        >
          {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Send Test Email
        </button>

        <button
          onClick={() => onSave(formData)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  );
}

