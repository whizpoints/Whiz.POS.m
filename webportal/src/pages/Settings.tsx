import { useState, useEffect, type ReactNode } from 'react';
import {
  Key, Copy, CheckCircle2, CreditCard, ShieldCheck, AlertTriangle,
  RefreshCw, Eye, EyeOff, Save, Building2, Globe, Lock, User2,
  Bell, Palette, Database, Download, Trash2, ChevronRight, Mail, MessageSquare, MonitorSmartphone
} from 'lucide-react';
import toast from 'react-hot-toast';


type Tab = 'security' | 'payments' | 'etims' | 'profile' | 'notifications';

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'security', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { id: 'payments', label: 'M-Pesa', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'etims', label: 'eTIMS KRA', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'profile', label: 'Business Profile', icon: <Building2 className="w-4 h-4" /> },
  { id: 'notifications', label: 'Alerts', icon: <Bell className="w-4 h-4" /> }
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('security');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      
      let parsedSettings = {};
      try {
        parsedSettings = typeof profile?.settings === 'string' ? JSON.parse(profile.settings) : (profile?.settings || {});
      } catch (e) {}

      const mergedSettings = { ...parsedSettings, ...updates };

      const res = await fetch(`${API_BASE_URL}/api/business/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ settings: JSON.stringify(mergedSettings) })
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
    <div className="space-y-6 md:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mx-0.5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] mb-1">
            Configuration
          </div>
          <h1 className="font-heading text-2xl md:text-[1.7rem] font-black tracking-tight text-[color:var(--text-primary)] truncate">
            System Settings
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1 md:mt-0.5">
            Manage API keys, payment integrations, compliance, and business identity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "whiz_pos_config.json");
              document.body.appendChild(downloadAnchorNode); // required for firefox
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="btn btn-secondary !px-4 md:!px-3 py-2.5 md:py-2 w-full md:w-auto inline-flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export Config
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-1.5 bg-slate-100/80 md:bg-[color:var(--bg-glass)] md:glass-strong rounded-2xl md:rounded-2xl border border-slate-200/60 md:border-transparent min-w-max">
          {tabs.map(t => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 md:px-3.5 md:py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap ${
                  active 
                  ? 'bg-white text-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] md:text-white md:shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                style={active ? { 
                  background: 'var(--mobile-active-bg, white)',
                  ...(window.innerWidth >= 768 ? { background: 'var(--accent-gradient)', boxShadow: '0 8px 24px -10px color-mix(in oklab, var(--accent) 60%, transparent)' } : {})
                } : {}}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels */}
      <div className="space-y-6 md:space-y-4">
        {tab === 'security' && <SecurityPanel profile={profile} fetchProfile={fetchProfile} />}
        {tab === 'payments' && <PaymentsPanel />}
        {tab === 'etims' && <ETimsPanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'profile' && <ProfilePanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'notifications' && <NotificationsPanel profile={profile} onSave={updateProfileSettings} />}
      </div>
    </div>
  );
}

/* --------------------------- Security --------------------------- */

function CopyField({ value, mono = true, isSecret = false }: { value: string; mono?: boolean; isSecret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(!isSecret);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
      <div
        className={`input flex-1 min-h-[44px] h-auto !pr-3 py-2.5 items-center inline-flex overflow-hidden ${mono ? 'font-mono text-[13px]' : 'text-sm'}`}
        style={mono ? { letterSpacing: '0.2px' } : {}}
      >
        <span className="break-all text-[color:var(--text-primary)]">
          {show ? value : '••••••••••••••••••••••••'}
        </span>
      </div>
      <div className="flex gap-2">
        {isSecret && (
          <button
            onClick={() => setShow(!show)}
            className="btn btn-secondary flex-1 md:!w-11 md:!h-11 inline-flex items-center justify-center shrink-0"
            aria-label="Toggle visibility"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={copy}
          className="btn btn-secondary flex-1 md:!w-11 md:!h-11 inline-flex items-center justify-center shrink-0"
          aria-label="Copy value"
        >
          {copied
            ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
            : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ApiKeyRow({ label, keyStr, status, badge }: { label: string; keyStr: string; status: 'live' | 'test' | 'revoked'; badge: string }) {
  return (
    <div className="glass-subtle rounded-xl p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 25%, transparent), color-mix(in oklab, var(--accent-secondary) 22%, transparent))' }}>
            <Key className="w-5 h-5 text-[color:var(--accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[color:var(--text-primary)] truncate">{label}</div>
            <div className="text-xs text-[color:var(--text-muted)] font-mono mt-0.5">Created Mar 12, 2025 • Last used 2h ago</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge badge-${status === 'live' ? 'success' : status === 'test' ? 'info' : 'error'}`}>{badge}</span>
          <button className="btn btn-ghost !w-10 !h-10 !p-0 inline-flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]" title="Rotate">
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          <button className="btn btn-ghost !w-10 !h-10 !p-0 inline-flex items-center justify-center text-[color:var(--text-muted)] hover:text-red-500" title="Revoke">
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
      <CopyField value={keyStr} isSecret={true} />
    </div>
  );
}

function SecurityPanel({ profile, fetchProfile }: any) {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);

  const handleGenerateKey = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/business/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ apiKey: 'sk_live_' + Math.random().toString(36).substr(2, 16) })
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generatePairingCode = async () => {
    setIsGeneratingPairing(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/auth/generate-pairing-code`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPairingCode(data.pairingCode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPairing(false);
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="Security"
        title="API Credentials"
        description="Authenticate your POS terminals and third-party integrations. Treat these keys like passwords."
        icon={<ShieldCheck className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.18))"
      />

      <div className="alert alert-warning rounded-xl">
        <div className="flex gap-2.5 items-start">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-500" />
          <div className="text-sm leading-relaxed">
            <strong className="font-semibold">Do not share these keys.</strong> If you suspect a key has been compromised, rotate it immediately.
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {profile?.apiKey ? (
          <ApiKeyRow label="Live Production Key" keyStr={profile.apiKey} status="live" badge="LIVE" />
        ) : (
          <div className="glass-subtle rounded-xl p-5 md:p-6 space-y-4 flex flex-col items-center justify-center">
             <p className="text-sm text-[color:var(--text-secondary)]">No API key generated yet.</p>
             <button onClick={handleGenerateKey} className="btn btn-primary w-full md:w-auto text-sm inline-flex justify-center items-center gap-1.5">
               <Key className="w-4 h-4" />
               Generate Live Key
             </button>
          </div>
        )}
      </div>

      {profile?.apiKey && (
        <div className="mt-8 border-t border-[color:var(--border-default)] pt-8 space-y-6">
          <SectionHeader
            eyebrow="Device Pairing"
            title="POS 2FA Authentication"
            description="Generate a temporary 6-digit code to securely pair a new POS terminal to this account."
            icon={<ShieldCheck className="w-5 h-5" />}
            gradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.18))"
          />
          
          <div className="glass-subtle rounded-xl p-5 md:p-6 flex flex-col items-center justify-center space-y-5">
            {pairingCode ? (
              <div className="text-center space-y-3 w-full">
                <p className="text-sm text-[color:var(--text-secondary)]">Your one-time pairing code is:</p>
                <div className="text-5xl md:text-4xl font-mono font-bold tracking-widest text-[color:var(--text-primary)] bg-[color:var(--bg-default)] py-4 md:py-3 px-6 rounded-xl shadow-inner break-all">
                  {pairingCode}
                </div>
                <p className="text-xs text-amber-600 mt-2">Enter this on the POS along with your API key.</p>
              </div>
            ) : (
              <button 
                onClick={generatePairingCode} 
                disabled={isGeneratingPairing}
                className="btn btn-primary w-full md:w-auto justify-center"
              >
                {isGeneratingPairing ? 'Generating...' : 'Generate 2FA Pairing Code'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
               style={{ background: 'color-mix(in oklab, var(--accent) 15%, transparent)' }}>
            <User2 className="w-5 h-5 text-[color:var(--accent)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[0.95rem] text-[color:var(--text-primary)] mb-1">Webhook Endpoints</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">Subscribe to payment confirmations, stock alerts, and eTIMS events.</p>
          </div>
        </div>
        <button className="btn btn-secondary w-full md:w-auto inline-flex justify-center items-center gap-1.5 text-sm">
          <ChevronRight className="w-4 h-4" />
          Manage Webhooks
        </button>
      </div>
    </>
  );
}

/* --------------------------- Payments --------------------------- */
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
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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

  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  return (
    <>
      <SectionHeader
        eyebrow="Payments"
        title="M-Pesa Daraja Credentials"
        description="Configure Safaricom API keys to enable STK push, reversals, and automatic payment verification."
        icon={<CreditCard className="w-5 h-5" />}
        gradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.16))"
      />

      <div className="glass-panel rounded-2xl p-4 md:p-6 space-y-5 md:space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label">Merchant Type</label>
                <div className="relative">
                  <select name="merchantType" value={config.merchantType} onChange={handleChange} className="input appearance-none">
                    <option value="BUY_GOODS">Buy Goods / Till</option>
                    <option value="PAYBILL">PayBill</option>
                  </select>
                </div>
              </div>

              {config.merchantType === 'BUY_GOODS' && (
                <div className="md:col-span-2">
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

              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      {showConsumer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                    >
                      {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 mt-2">
                <h3 className="font-medium text-sm text-[color:var(--text-primary)] mb-3">Features</h3>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <input type="checkbox" name="stkEnabled" checked={config.stkEnabled} onChange={handleChange} className="w-4.5 h-4.5 text-green-500 rounded focus:ring-green-500" />
                  <span className="text-sm text-[color:var(--text-primary)]">STK Push Enabled</span>
                </label>
                <label className="flex items-center gap-3 mt-1 cursor-pointer p-3 rounded-xl hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <input type="checkbox" name="c2bEnabled" checked={config.c2bEnabled} onChange={handleChange} className="w-4.5 h-4.5 text-green-500 rounded focus:ring-green-500" />
                  <span className="text-sm text-[color:var(--text-primary)]">C2B Callbacks Enabled</span>
                </label>
              </div>

              <div className="md:col-span-2 mt-6 pt-6 border-t border-[color:var(--border-subtle)]">
                <h3 className="font-medium text-sm text-[color:var(--text-primary)] mb-4">Callback Configuration (Dynamic)</h3>
                
                <label className="label">STK Callback</label>
                <CopyField value={`${baseUrl}/api/callbacks/payments/callback/stk/${businessId}`} />
                
                <label className="label mt-5">C2B Confirmation</label>
                <CopyField value={`${baseUrl}/api/callbacks/payments/callback/c2b/confirmation/${businessId}`} />
                
                <label className="label mt-5">C2B Validation</label>
                <CopyField value={`${baseUrl}/api/callbacks/payments/callback/c2b/validation/${businessId}`} />
                
                <p className="mt-4 text-[11.5px] text-[color:var(--text-muted)] leading-relaxed">
                  These URLs are uniquely generated for your business tenant.
                </p>
                <button 
                  onClick={handleRegisterC2b} 
                  disabled={isRegistering || !config.c2bEnabled} 
                  className="mt-4 w-full md:w-auto btn btn-secondary text-sm inline-flex justify-center items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  {isRegistering ? 'Registering...' : 'Register C2B URLs'}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row md:items-center justify-end gap-3 pt-4 border-t border-[color:var(--border-subtle)] mt-6">
              <button disabled={isSaving} onClick={handleSave} className="btn btn-primary w-full md:w-auto text-sm inline-flex justify-center items-center gap-2 disabled:opacity-50">
                <Save className="w-4.5 h-4.5" />
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* --------------------------- eTIMS --------------------------- */

function ETimsPanel({ profile, onSave }: any) {
  const [showToken, setShowToken] = useState(false);
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
        <div className="glass-panel rounded-2xl p-4 md:p-6 space-y-5 md:space-y-6 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="md:col-span-2">
              <label className="label">VSDC Auth Token</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input 
                  type={showToken ? 'text' : 'password'} 
                  name="etimsToken" 
                  value={formData.etimsToken} 
                  onChange={handleChange} 
                  className="input !pl-10 !pr-10 font-mono text-[13px]" 
                  placeholder="••••••••••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 pt-2 border-t border-[color:var(--border-subtle)] mt-4">
            <label className="inline-flex items-start md:items-center gap-3 text-sm text-[color:var(--text-secondary)] select-none cursor-pointer p-2 md:p-0">
              <input type="checkbox" name="etimsAutoRetry" checked={formData.etimsAutoRetry} onChange={handleChange} className="mt-0.5 md:mt-0 w-4.5 h-4.5 rounded border-[color:var(--border-default)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]" />
              Auto-retry failed signings (max 3 attempts)
            </label>
            <div className="flex flex-col md:flex-row gap-2">
              <button className="btn btn-secondary w-full md:w-auto text-sm inline-flex justify-center items-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Ping Control Unit
              </button>
              <button onClick={() => onSave(formData)} className="btn btn-primary w-full md:w-auto text-sm inline-flex justify-center items-center gap-1.5">
                <Save className="w-4 h-4" />
                Activate eTIMS
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(16,185,129,0.16)' }}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">Active</div>
                <div className="text-[15px] font-semibold text-[color:var(--text-primary)]">Signing online</div>
              </div>
            </div>
            <div className="space-y-3 text-[13px]">
              <StatRow label="Signed today" value="184" accent />
              <StatRow label="Failed (retrying)" value="2" />
              <StatRow label="Last CU ping" value="68 ms" />
              <StatRow label="eTIMS version" value="v3.2.1" />
            </div>
          </div>

          <div className="glass-subtle rounded-2xl p-4 md:p-5 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
            <div className="flex items-center gap-2 mb-2 font-semibold text-[color:var(--text-primary)]">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
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
  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.documentLogoUrl || profile?.logoUrl || null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    legalName: profile?.settings?.legalName || profile?.name || '',
    tradeName: profile?.settings?.tradeName || '',
    phone: profile?.settings?.phone || '',
    email: profile?.settings?.email || '',
    address: profile?.settings?.address || '',
    currency: profile?.settings?.currency || 'KES',
    timezone: profile?.settings?.timezone || 'Africa/Nairobi',
    receiptFooterNote: profile?.settings?.receiptFooterNote || ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        legalName: profile?.settings?.legalName || profile?.name || '',
        tradeName: profile?.settings?.tradeName || '',
        phone: profile?.settings?.phone || '',
        email: profile?.settings?.email || '',
        address: profile?.settings?.address || '',
        currency: profile?.settings?.currency || 'KES',
        timezone: profile?.settings?.timezone || 'Africa/Nairobi',
        receiptFooterNote: profile?.settings?.receiptFooterNote || ''
      });
      setLogoUrl(profile?.documentLogoUrl || profile?.logoUrl || null);
    }
  }, [profile]);

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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
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
        <div className="glass-panel rounded-2xl p-4 md:p-6 space-y-5 md:space-y-6 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <label className="label">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" />
            </div>
            <div className="md:col-span-2">
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

          <div className="flex justify-end pt-2 border-t border-[color:var(--border-subtle)] mt-4">
            <button onClick={() => onSave(formData)} className="btn btn-primary w-full md:w-auto text-sm inline-flex justify-center items-center gap-2">
              <Save className="w-4 h-4" />
              Save Profile
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 md:p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-3">Receipt Branding</div>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0 overflow-hidden shadow-sm"
                     style={{ background: 'var(--accent-gradient)' }}>
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : 'WS'}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-[color:var(--text-primary)] truncate">Logo Preview</div>
                  <div className="text-[11.5px] text-[color:var(--text-muted)] mt-0.5">PNG or JPG, max 512×512px</div>
                </div>
              </div>
              <label className="btn btn-secondary text-sm !px-4 md:!px-3 py-2.5 md:py-2 cursor-pointer text-center">
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} disabled={uploading} />
              </label>
            </div>
            <label className="label !text-xs !mb-2">Receipt Footer Note</label>
            <textarea name="receiptFooterNote" value={formData.receiptFooterNote} onChange={handleChange} className="textarea min-h-[80px] !text-[13px]" />
          </div>

          <div className="glass-subtle rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <Palette className="w-4.5 h-4.5 text-[color:var(--accent)]" />
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Theme hint</div>
            </div>
            <p className="text-[13px] text-[color:var(--text-secondary)] leading-relaxed">
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
        <div className="glass-panel rounded-2xl p-3 md:p-4 divide-y divide-[color:var(--border-subtle)] lg:col-span-2">
          {rows.map((r) => (
            <label key={r.key} className="flex flex-col md:flex-row md:items-start gap-4 p-4 md:p-4 rounded-xl cursor-pointer transition-colors hover:bg-[color:var(--bg-subtle)]">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={(formData as any)[r.key]}
                  onChange={(e) => handleToggle(r.key, e.target.checked)}
                  className="mt-0.5 w-5 h-5 md:w-4.5 md:h-4.5 rounded border-[color:var(--border-default)] text-[color:var(--accent)] focus:ring-[color:var(--accent)] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] md:text-sm font-semibold text-[color:var(--text-primary)]">{r.label}</div>
                  <div className="text-[13px] md:text-xs text-[color:var(--text-secondary)] leading-relaxed mt-1 md:mt-0.5">{r.hint}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-8 md:pl-0">
                <ChannelChip icon={<Mail className="w-4 h-4 md:w-3.5 md:h-3.5"/>} active={(formData as any)[r.key]} />
                <ChannelChip icon={<MonitorSmartphone className="w-4 h-4 md:w-3.5 md:h-3.5"/>} active={(formData as any)[r.key]} />
                <ChannelChip icon={<MessageSquare className="w-4 h-4 md:w-3.5 md:h-3.5"/>} active={false} />
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-[color:var(--accent)]" />
              <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Channels</div>
            </div>
              <ChannelRow icon={<Mail className="w-4 h-4" />} name="Email" value={profile?.settings?.email || profile?.email || "Set email in Profile"} />
              <ChannelRow icon={<MessageSquare className="w-4 h-4" />} name="SMS (Twilio)" value={profile?.settings?.phone || profile?.phone || "Set phone in Profile"} muted />
              <ChannelRow icon={<MonitorSmartphone className="w-4 h-4" />} name="In-app" value="All staff with Admin role" />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => onSave(formData)} className="btn btn-primary w-full md:w-auto text-sm inline-flex justify-center items-center gap-2">
              <Save className="w-4.5 h-4.5" />
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

  function ChannelChip({ icon, active }: { icon: ReactNode; active: boolean }) {
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

  function ChannelRow({ icon, name, value, muted }: { icon: ReactNode; name: string; value: string; muted?: boolean }) {
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
