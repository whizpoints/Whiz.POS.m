import { useState, useEffect, type ReactNode } from 'react';
import {
  Key, Copy, CheckCircle2, CreditCard, ShieldCheck, AlertTriangle,
  RefreshCw, Eye, EyeOff, Save, Building2, Globe, Lock, User2,
  Bell, Palette, Database, Download, Trash2, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../lib/utils';

import OutletsManager from '../components/Settings/OutletsManager';
import TerminalManager from '../components/Settings/TerminalManager';

type Tab = 'security' | 'payments' | 'outlets' | 'terminals' | 'etims' | 'profile' | 'notifications';

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'security', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { id: 'payments', label: 'M-Pesa', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'outlets', label: 'Registers & Outlets', icon: <Building2 className="w-4 h-4" /> },
  { id: 'terminals', label: 'POS Terminals', icon: <Database className="w-4 h-4" /> },
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
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/business/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
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
        {tab === 'outlets' && <OutletsManager />}
        {tab === 'terminals' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="section-header mb-6">
              <div>
                <h3 className="section-title">POS Terminals (LAN Setup)</h3>
                <p className="section-desc">Approve or revoke local POS terminals attempting to connect to this server.</p>
              </div>
            </div>
            <TerminalManager />
          </div>
        )}
        {tab === 'etims' && <ETimsPanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'profile' && <ProfilePanel profile={profile} onSave={updateProfileSettings} />}
        {tab === 'notifications' && <NotificationsPanel profile={profile} onSave={updateProfileSettings} />}
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
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);

  const handleGenerateKey = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
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
      const API_BASE_URL = getApiBaseUrl();
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
          <div className="glass-subtle rounded-xl p-4 space-y-3 flex flex-col items-center justify-center">
             <p className="text-sm text-[color:var(--text-secondary)]">No API key generated yet.</p>
             <button onClick={handleGenerateKey} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
               <Key className="w-4 h-4" />
               Generate Live Key
             </button>
          </div>
        )}
      </div>

      {profile?.apiKey && (
        <div className="mt-8 border-t border-[color:var(--border-default)] pt-8">
          <SectionHeader
            eyebrow="Device Pairing"
            title="POS 2FA Authentication"
            description="Generate a temporary 6-digit code to securely pair a new POS terminal to this account."
            icon={<ShieldCheck className="w-5 h-5" />}
            gradient="linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.18))"
          />
          
          <div className="glass-subtle rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
            {pairingCode ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-[color:var(--text-secondary)]">Your one-time pairing code is:</p>
                <div className="text-4xl font-mono font-bold tracking-widest text-[color:var(--text-primary)] bg-[color:var(--bg-default)] py-3 px-6 rounded-lg shadow-inner">
                  {pairingCode}
                </div>
                <p className="text-xs text-amber-600 mt-2">Enter this on the POS along with your API key.</p>
              </div>
            ) : (
              <button 
                onClick={generatePairingCode} 
                disabled={isGeneratingPairing}
                className="btn btn-primary"
              >
                {isGeneratingPairing ? 'Generating...' : 'Generate 2FA Pairing Code'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
               style={{ background: 'color-mix(in oklab, var(--accent) 15%, transparent)' }}>
            <User2 className="w-5 h-5 text-[color:var(--accent)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[0.95rem] text-[color:var(--text-primary)] mb-0.5">Webhook Endpoints</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">Subscribe to payment confirmations, stock alerts, and eTIMS events.</p>
          </div>
        </div>
        <button className="btn btn-secondary inline-flex items-center gap-1.5 self-start sm:self-center text-sm">
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
    receiptFooterNote: profile?.settings?.receiptFooterNote || ''
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
