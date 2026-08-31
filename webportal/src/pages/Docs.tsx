import { useState, type ReactNode } from 'react';
import { Book, Terminal, ShieldCheck, CreditCard, Copy, CheckCircle2, ChevronRight, Rocket, Server, Lock, Code2, AlertTriangle } from 'lucide-react';

type DocItem = {
  id: string;
  icon: ReactNode;
  title: string;
  render: () => ReactNode;
};

const codeSample = `GET /api/v1/sales
Headers:
  x-api-key: sk_live_xxxxxxxxxxxx
  
Response:
{
  "status": "success",
  "count": 284,
  "data": [
    {
      "id": "inv_01HQW8XYZ",
      "amount": 2450.00,
      "method": "MPESA",
      "created_at": "2025-03-18T09:12:44Z"
    }
  ]
}`;

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return { copied, copy };
}

function StepTile({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-subtle rounded-xl p-4 flex gap-3.5 items-start">
      <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[0.8rem] font-bold text-white"
           style={{ background: 'var(--accent-gradient)' }}>
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-[0.92rem] text-[color:var(--text-primary)] mb-1">{title}</h4>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div className="code-block relative group rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }}></span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }}></span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }}></span>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-[color:var(--text-muted)] ml-2 font-medium">cURL / REST</span>
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
          style={{
            background: copied ? 'color-mix(in oklab, #10b981 20%, transparent)' : 'rgba(255,255,255,0.04)',
            color: copied ? '#34d399' : 'var(--text-muted)',
            border: '1px solid',
            borderColor: copied ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'
          }}
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="font-mono text-[12.5px] leading-relaxed p-4 overflow-x-auto text-[#e2e8f0]"><code>{code}</code></pre>
    </div>
  );
}

export default function Docs() {
  const [activeId, setActiveId] = useState('quickstart');

  const sections: DocItem[] = [
    {
      id: 'quickstart',
      icon: <Book className="w-4 h-4" />,
      title: 'Quick Start Guide',
      render: () => (
        <div className="space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 30%, transparent), color-mix(in oklab, var(--accent-secondary) 25%, transparent))' }}>
              <Rocket className="w-6 h-6 text-[color:var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--text-primary)] mb-1.5">
                Getting Started with Whiz POS
              </h2>
              <p className="text-[0.95rem] text-[color:var(--text-secondary)] leading-relaxed">
                Whiz POS consists of two parts: the lightweight local Desktop App (for your cashiers) and this Cloud Web Portal (for your back-office management). Follow these steps to get up and running in under 5 minutes.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <StepTile n={1} title="Grab your API Key">
              Navigate to <span className="font-medium text-[color:var(--accent)]">Dashboard › Settings › Security</span> to copy your unique API key. You will use this to authenticate your local POS terminal.
            </StepTile>
            <StepTile n={2} title="Install the Desktop App">
              Download the Whiz POS installer from your dashboard welcome card and run it on your register PC. It works on Windows 10 and 11.
            </StepTile>
            <StepTile n={3} title="Connect your hardware">
              Plug in your thermal printer and barcode scanner. Windows auto-detects most USB devices — register your peripherals in App Settings › Hardware.
            </StepTile>
            <StepTile n={4} title="Sync your inventory">
              From the web portal, bulk-import products via CSV or add them manually. The POS terminal will pull the catalog on first launch.
            </StepTile>
          </div>

          <div className="alert alert-info rounded-xl">
            <div className="flex gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 shrink-0 mt-0.5 text-sky-500" />
              <div className="text-sm leading-relaxed">
                <strong className="font-semibold">Pro tip:</strong> Start with one register in Sandbox mode to verify your M-Pesa and print flows before switching to Production.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pos-linking',
      icon: <Server className="w-4 h-4" />,
      title: 'Desktop POS Linking',
      render: () => (
        <div className="space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 30%, transparent), color-mix(in oklab, var(--accent-secondary) 25%, transparent))' }}>
              <Server className="w-6 h-6 text-[color:var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--text-primary)] mb-1.5">
                Linking Desktop POS to Cloud
              </h2>
              <p className="text-[0.95rem] text-[color:var(--text-secondary)] leading-relaxed">
                Connect your local Desktop App to this Web Portal to synchronize sales, inventory, and users in real time.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <StepTile n={1} title="Generate API Key">
              Navigate to <span className="font-medium text-[color:var(--accent)]">System Settings (Security)</span> and click "Generate Key" to create a Live Production Key for your business.
            </StepTile>
            <StepTile n={2} title="Open POS Settings">
              On your installed Desktop App, click the Settings icon and navigate to the <strong>Cloud Sync</strong> tab.
            </StepTile>
            <StepTile n={3} title="Configure Endpoints">
              Enter this Web Portal URL (<code className="px-1.5 py-0.5 rounded bg-white/10">{typeof window !== 'undefined' ? window.location.origin : window.location.origin}</code>) as the Back Office URL, and paste the API Key generated in Step 1.
            </StepTile>
            <StepTile n={4} title="Link & Sync">
              Click "Link to Cloud". The system will verify the credentials and instantly fetch your latest products, users, and business settings.
            </StepTile>
          </div>
        </div>
      )
    },
    {
      id: 'mpesa',
      icon: <CreditCard className="w-4 h-4" />,
      title: 'M-Pesa Integration',
      render: () => (
        <div className="space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(5,150,105,0.15))' }}>
              <CreditCard className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--text-primary)] mb-1.5">
                Configuring M-Pesa Integrations
              </h2>
              <p className="text-[0.95rem] text-[color:var(--text-secondary)] leading-relaxed">
                Whiz POS supports automatic payment verification via STK Push and Direct-to-Till (C2B) payments. To enable this, you must configure your Safaricom Daraja API credentials below.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <StepTile n={1} title="Create a Daraja Developer App">
              Go to the <a href="https://developer.safaricom.co.ke/" target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] hover:underline font-medium">Safaricom Daraja Portal</a>, log in, and create a new App. Select <strong>M-Pesa Express</strong>, <strong>C2B</strong>, and <strong>Transaction Status</strong> APIs. Once created, copy the <em>Consumer Key</em> and <em>Consumer Secret</em> and paste them into your POS Developer Settings.
            </StepTile>
            <StepTile n={2} title="Understand your Shortcode & PartyB">
              For Buy Goods Tills, your <strong>Business Shortcode</strong> is your internal Store Number (e.g., 6 or 7 digits), and the <strong>PartyB</strong> is the public Till Number the customer sees. If you use a Paybill, they are usually the same. Enter these in your POS settings.
            </StepTile>
            <StepTile n={3} title="Create an API Initiator (G2 Portal)">
              To retrieve customer names for STK Push, you must authenticate the backend with Safaricom. Log into the <a href="https://org.ke.m-pesa.com/" target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] hover:underline font-medium">M-Pesa G2 Organization Portal</a> as a <strong>Manager</strong>. Create a new user with <strong>WEB</strong> and <strong>ACCESS CHANNEL</strong> as <strong>api</strong>. Assign this API account a strong password. Use this username and password as your <strong>Initiator Name</strong> and <strong>Initiator Password</strong> in the POS Settings.
            </StepTile>
            <StepTile n={4} title="Register C2B URLs (Direct-to-Till Payments)">
              To instantly detect when a customer sends money directly to your Till, you must tell Safaricom where to send the notifications. Open your POS Settings, scroll down to the M-Pesa section, and click the green <strong>Register C2B URLs</strong> button. You only need to do this once per Till!
            </StepTile>
          </div>

          <div className="alert alert-info rounded-xl mt-4">
            <div className="flex gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 shrink-0 mt-0.5 text-sky-500" />
              <div className="text-sm leading-relaxed">
                <strong className="font-semibold">Automatic Certificate Encryption:</strong> Safaricom requires your Initiator Password to be encrypted using their X.509 Public Certificate. The Whiz POS backend automatically fetches the Production Certificate from Daraja and encrypts your password on the fly, so no further setup is required!
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'etims',
      icon: <ShieldCheck className="w-4 h-4" />,
      title: 'eTIMS KRA Setup',
      render: () => (
        <div className="space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(217,119,6,0.15))' }}>
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--text-primary)] mb-1.5">
                KRA eTIMS Integration
              </h2>
              <p className="text-[0.95rem] text-[color:var(--text-secondary)] leading-relaxed">
                Electronic Tax Invoice Management System (eTIMS) compliance is required for VAT-registered businesses in Kenya. Whiz POS automatically signs and pushes your receipts to KRA at the moment of sale.
              </p>
            </div>
          </div>

          <div className="alert alert-warning rounded-xl">
            <div className="flex gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-500" />
              <div className="text-sm leading-relaxed">
                <strong className="font-semibold">Required credentials:</strong> You must upload your KRA eTIMS VSDC device details — PIN, Branch ID, Device Serial, and the VSDC control unit URL — in the Settings dashboard to activate this feature.
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-subtle rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-[color:var(--accent)]" />
                <h4 className="font-semibold text-sm text-[color:var(--text-primary)]">What we sign</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-[color:var(--text-secondary)]">
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> Each line item with tax rate</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> Subtotals, discounts, rounding</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> Customer PIN when provided</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> Receipt QR code &amp; CU checksum</li>
              </ul>
            </div>
            <div className="glass-subtle rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Book className="w-4 h-4 text-[color:var(--accent)]" />
                <h4 className="font-semibold text-sm text-[color:var(--text-primary)]">Reports available</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-[color:var(--text-secondary)]">
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> Daily eTIMS transmission log</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> Failed-signing retries queue</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> VAT reconciliation export</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[color:var(--accent)]" /> KRA-ready iTax CSV upload</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'api',
      icon: <Terminal className="w-4 h-4" />,
      title: 'API Reference',
      render: () => (
        <div className="space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.24), rgba(168,85,247,0.18))' }}>
              <Code2 className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--text-primary)] mb-1.5">
                Developer REST API
              </h2>
              <p className="text-[0.95rem] text-[color:var(--text-secondary)] leading-relaxed">
                Integrate Whiz POS directly with your existing ERP, accounting software, or custom e-commerce storefront using our JSON REST API.
              </p>
            </div>
          </div>

          <CodeBlock code={codeSample} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-subtle rounded-xl p-4">
              <div className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2"
                   style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>GET</div>
              <h4 className="font-mono text-[0.8rem] text-[color:var(--text-primary)] mb-1 break-all">/api/v1/sales</h4>
              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">List paginated receipts with filters for date, register, and payment method.</p>
            </div>
            <div className="glass-subtle rounded-xl p-4">
              <div className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2"
                   style={{ background: 'rgba(59,130,246,0.18)', color: '#3b82f6' }}>POST</div>
              <h4 className="font-mono text-[0.8rem] text-[color:var(--text-primary)] mb-1 break-all">/api/v1/products</h4>
              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">Create or bulk-import catalog items. Supports SKU, barcodes, VAT class, and reorder levels.</p>
            </div>
            <div className="glass-subtle rounded-xl p-4">
              <div className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2"
                   style={{ background: 'rgba(168,85,247,0.18)', color: '#a855f7' }}>POST</div>
              <h4 className="font-mono text-[0.8rem] text-[color:var(--text-primary)] mb-1 break-all">/api/v1/stkpush</h4>
              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">Trigger an STK push from your own frontend. We handle the callback and return the payment status.</p>
            </div>
          </div>

          <div className="alert alert-info rounded-xl">
            <div className="flex gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 shrink-0 mt-0.5 text-sky-500" />
              <div className="text-sm leading-relaxed">
                All API requests must include the header <code className="px-1.5 py-0.5 rounded-md font-mono text-[0.8rem] bg-[color:var(--bg-subtle)] text-[color:var(--accent)]">x-api-key</code>. Rotate keys anytime from Settings › Security.
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const active = sections.find(s => s.id === activeId) ?? sections[0];

  return (
    <div className="pt-32 pb-20 min-h-screen relative overflow-hidden w-full">
      <div className="bg-orb bg-orb-1 opacity-25 animate-pulse-glow"></div>
      <div className="bg-orb bg-orb-2 opacity-25 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-strong text-xs font-semibold mb-3">
            <Book className="w-3.5 h-3.5 text-[color:var(--accent)]" />
            <span className="text-[color:var(--text-secondary)]">Developer Docs</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-[color:var(--text-primary)] mb-1.5">
            Whiz POS Documentation
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)] max-w-2xl">
            In-depth guides, API references, and configuration walkthroughs for operators and developers.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
          {/* Sidebar */}
          <aside className="w-full lg:w-60 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1 glass-panel rounded-2xl p-2.5">
              <div className="px-2.5 py-2 mb-1">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Navigation
                </span>
              </div>
              {sections.map(section => {
                const isActive = section.id === activeId;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveId(section.id)}
                    className={`w-full group flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all relative ${
                      isActive ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 16%, transparent), transparent 85%)',
                      boxShadow: 'inset 2px 0 0 0 var(--accent)'
                    } : {}}
                  >
                    <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? 'text-white'
                        : 'text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)]'
                    }`} style={isActive ? { background: 'var(--accent-gradient)' } : { background: 'color:var(--bg-subtle)' }}>
                      {section.icon}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div key={active.id} className="glass-panel rounded-2xl p-5 sm:p-7 animate-in fade-in slide-in-from-bottom-3 duration-500">
              {active.render()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

