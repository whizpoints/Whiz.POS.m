const fs = require('fs');

const filePath = 'c:\\Users\\Josphat Mburu\\Documents\\codes\\Whiz_POS-master\\webportal\\src\\pages\\Settings.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const settingsComp = `export default function Settings() {
  const [tab, setTab] = useState<Tab>('security');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(\`\${API_BASE_URL}/api/business/profile\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(\`\${API_BASE_URL}/api/business/profile\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ settings: { ...profile?.settings, ...updates } })
      });
      if (res.ok) {
        fetchProfile();
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
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
              className={\`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap \${
                active ? 'text-white shadow-md' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)]'
              }\`}
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
        {tab === 'notifications' && <NotificationsPanel profile={profile} onSave={updateProfileSettings} />}
      </div>
    </div>
  );
}`;

content = content.replace(/export default function Settings\(\) \{[\s\S]*?(?=\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- Security \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/)/, settingsComp + '\n\n');

const securityComp = `function SecurityPanel({ profile, fetchProfile }: any) {
  const handleGenerateKey = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(\`\${API_BASE_URL}/api/business/profile\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ apiKey: 'sk_live_' + Math.random().toString(36).substr(2, 16) })
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
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
}`;

content = content.replace(/function SecurityPanel\(\) \{[\s\S]*?(?=\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- Payments \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/)/, securityComp + '\n\n');

content = content.replace(
  "function ApiKeyRow({ label, key, status, badge }: { label: string; key: string; status: 'live' | 'test' | 'revoked'; badge: string }) {",
  "function ApiKeyRow({ label, keyStr, status, badge }: { label: string; keyStr: string; status: 'live' | 'test' | 'revoked'; badge: string }) {"
);
content = content.replace(/<CopyField value=\{key\} \/>/g, "<CopyField value={keyStr} />");


const etimsComp = `function ETimsPanel({ profile, onSave }: any) {
  const [formData, setFormData] = useState({
    etimsPin: profile?.settings?.etimsPin || '',
    etimsBranch: profile?.settings?.etimsBranch || '',
    etimsSerial: profile?.settings?.etimsSerial || '',
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
}`;

content = content.replace(/function ETimsPanel\(\) \{[\s\S]*?(?=\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- Profile \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/)/, etimsComp + '\n\n');


const profileComp = `function ProfilePanel({ profile, onSave }: any) {
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
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(\`\${API_BASE_URL}/api/business/logo\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` },
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogoUrl(data.business.logoUrl);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Network error during upload');
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
}`;

content = content.replace(/function ProfilePanel\(\) \{[\s\S]*?(?=\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- Notifications \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/)/, profileComp + '\n\n');


const notificationsComp = `function NotificationsPanel({ profile, onSave }: any) {
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
    { key: 'alertWeeklyBrief', label: 'Weekly performance brief', hint: 'Comparison to last week\\'s top-line metrics.' }
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
}`;

content = content.replace(/function NotificationsPanel\(\) \{[\s\S]*?(?=\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- Shared primitives \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/)/, notificationsComp + '\n\n');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated Settings.tsx');
