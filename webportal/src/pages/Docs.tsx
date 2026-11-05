import { useState, type ReactNode } from 'react';
import {
  Book, ShieldCheck, CreditCard, Copy, CheckCircle2,
  Server, Code2, Boxes, Printer, QrCode, FileBarChart, Search,
  Activity, Smartphone, Download, Database, Layers, Laptop, Receipt, Zap
} from 'lucide-react';

type DocSection = {
  id: string;
  icon: ReactNode;
  title: string;
  badge?: string;
  render: () => ReactNode;
};

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const { copied, copy } = useCopy(code);
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950 text-slate-100 overflow-hidden shadow-xl my-4">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold ml-2">
            {language}
          </span>
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>
      <pre className="p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto text-emerald-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 shadow-sm flex items-start gap-4">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-cyan-500/20">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h4>
        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoCallout({ title, children, type = 'info' }: { title: string; children: ReactNode; type?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200',
    warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
  };

  return (
    <div className={`p-4 rounded-2xl border ${styles[type]} my-4 flex items-start gap-3`}>
      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed">
        <strong className="font-bold block mb-0.5">{title}</strong>
        {children}
      </div>
    </div>
  );
}

export default function Docs() {
  const [activeId, setActiveId] = useState('architecture');
  const [searchQuery, setSearchQuery] = useState('');

  const sections: DocSection[] = [
    {
      id: 'architecture',
      icon: <Server className="w-4 h-4 text-cyan-500" />,
      title: '3-Tier Edge Architecture',
      badge: 'Core',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              3-Tier Distributed Architecture & Offline Guarantee
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Whiz POS uses an offline-first, three-tier model engineered to maintain 100% cashier checkout uptime 
              even when the store experiences internet or power disruption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs font-mono uppercase">
                <Laptop className="w-4 h-4" />
                <span>Tier 1: Desktop POS</span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Cashier Register Terminal</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Lightweight Electron app running an embedded local SQLite engine (<code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">sqlite-db.cjs</code>). 
                Processes item barcode scans in &lt;0.2ms. Offline sales queue in <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">pending_syncs</code>.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs font-mono uppercase">
                <Database className="w-4 h-4" />
                <span>Tier 2: Local Shop Server</span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Outlet LAN Point of Truth</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Node/Express service on local network (Port 5050). Aggregates all terminals in the shop, prevents duplicate inventory deductions locally, 
                and manages local M-Pesa & eTIMS dispatch.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono uppercase">
                <Layers className="w-4 h-4" />
                <span>Tier 3: Cloud Web Portal</span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Central Multi-Tenant Hub</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Global cloud back-office hosted at <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">api.whizpoint.app</code>. 
                Synchronizes multi-outlet catalogs, reports, customer ledgers, and remote configurations.
              </p>
            </div>
          </div>

          <InfoCallout title="Cloudflare Tunnel Network Configuration" type="info">
            On host machines, a production Cloudflare Tunnel routes <code className="font-mono font-bold">localhost:3000</code> to <code className="font-mono font-bold">https://api.whizpoint.app</code> with 
            valid public HTTPS certificates. External services (such as Safaricom M-Pesa webhooks) and remote tablet/phone browsers communicate directly via this URL.
          </InfoCallout>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delta Synchronization State Machine</h3>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              Data synchronization between Local Shop Servers and the Cloud Web Portal operates via a 60-second background cron 
              using Last-Write-Wins (LWW) conflict resolution:
            </p>
            <CodeBlock code={`// Continuous Local Server <-> Cloud Web Portal Delta Sync
POST https://api.whizpoint.app/api/sync/delta
Headers:
  Authorization: Bearer <OUTLET_API_KEY>
  Content-Type: application/json

Payload:
{
  "locationId": "60c84402-a653-401e-a56d-fdd6f3853b1c",
  "outletId": "cmw0s4hha0000kx36im5v9341",
  "lastSyncTimestamp": "2026-11-05T01:45:00.000Z",
  "pushedTransactions": [ ... ],
  "pushedStockMovements": [ ... ]
}`} language="json" />
          </div>
        </div>
      )
    },
    {
      id: 'mpesa',
      icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
      title: 'M-Pesa Daraja 2.0 & KYC',
      badge: 'Payments',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Safaricom Daraja 2.0, STK Push & Automated Customer KYC
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Whiz POS features direct asynchronous integration with Safaricom Daraja M-Pesa APIs, delivering 
              sub-450ms prompt dispatch, automated customer name formatting, and phone number memory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                Customer BuyGoods Till (PartyB)
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                For BuyGoods tills: Business Shortcode is your Store Number (e.g., 7128505), and PartyB is the public 
                Till Number displayed to shoppers (e.g., 3098707).
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-500" />
                Paybill (Account Reference)
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                For Paybill numbers: Shortcode and PartyB are identical. The POS automatically assigns the 
                invoice/receipt number (e.g., INV-73260) as the Account Reference.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer KYC Name Auto-Resolution</h3>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              Because raw STK callbacks do not contain the customer's name by Safaricom specification, Whiz POS automatically 
              enriches the transaction using our multi-tier resolution directory:
            </p>
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 font-mono text-xs space-y-2">
              <div className="text-slate-500">// Resolution Hierarchy</div>
              <div>1. POS Local Customer Directory (<code className="text-cyan-400 font-bold">pos_customer_phone_directory</code> in localStorage)</div>
              <div>2. Web Portal Central Customer Master (<code className="text-cyan-400 font-bold">api/customers</code>)</div>
              <div>3. Previous M-Pesa C2B Receipts matching phone digits</div>
              <div className="pt-2 border-t border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                Output Format: JOSPHAT NJUGUNA MBURU &rarr; Josphat Mburu (Clean First + Last)
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Latency & Stopwatch Telemetry</h3>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              Every M-Pesa request is logged with millisecond stopwatch timestamps (<code className="font-mono">YYYY-MM-DD HH:mm:ss.SSS</code>):
            </p>
            <CodeBlock code={`[2026-11-05 01:47:53.112] [Backend STK Push] Received request for 254740841168, Amount: 5
[2026-11-05 01:47:53.154] [Daraja Request] Fetching OAuth Token (+42ms)
[2026-11-05 01:47:53.310] [Daraja Request] Sending STK Push to processrequest (+198ms)
[2026-11-05 01:47:53.532] [Daraja Response] ResponseCode: 0, Accepted for processing (+420ms total)
[2026-11-05 01:48:02.840] [M-Pesa Webhook] STK Callback received: ResultCode: 0, Receipt: UK5KZ13A22`} language="log" />
          </div>
        </div>
      )
    },
    {
      id: 'inventory',
      icon: <Boxes className="w-4 h-4 text-blue-500" />,
      title: 'Inventory & Outlets',
      badge: 'Catalog',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Single-Shop Direct Selling vs Multi-Outlet Central Stores
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Proper inventory configuration prevents stock double-counting and eliminates cashier confusion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                Recommended for 1 Shop
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Direct Selling (Shared Inventory)</h3>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li><code className="font-mono">inventoryMode: 'SHARED'</code></li>
                <li><code className="font-mono">hasCentralStore: false</code></li>
                <li>Products added or received immediately reflect at the cashier tills.</li>
                <li>No Good Received Notes (GRN) or stock transfers required.</li>
                <li>Zero risk of double-counting between warehouse and till.</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-700 dark:text-blue-300">
                Multi-Branch Enterprise
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Central Warehouse + Outlets</h3>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li><code className="font-mono">inventoryMode: 'SEPARATE'</code></li>
                <li><code className="font-mono">hasCentralStore: true</code></li>
                <li>Goods received enter Central Warehouse via GRN.</li>
                <li>Stock is dispatched to outlets (e.g. Westlands, Mombasa) via Transfer Notes.</li>
                <li>Destination outlet managers must click "Accept Transfer" to confirm received units.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sequential SKU Auto-Generation</h3>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              When creating new products or importing bulk Excel catalogs with missing SKUs, Whiz POS automatically 
              assigns collision-free sequential SKU identifiers:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs flex items-center justify-between">
              <span>PRD-00001 &rarr; PRD-00002 &rarr; PRD-00003</span>
              <span className="text-emerald-400 font-bold">100% Collision-Free</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'reports',
      icon: <FileBarChart className="w-4 h-4 text-purple-500" />,
      title: '7 BI Reports & Daily PDF',
      badge: 'Analytics',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Business Intelligence, Audits & Executive Daily PDF
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Gain complete financial visibility across stock valuation, shrinkage, bestsellers, cashier drawer shifts, 
              and boardroom-ready PDF generation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">1. Stock Valuation (Cost vs Retail)</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Calculates total store assets at cost price vs potential retail selling value, with gross profit margin %.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">2. Dead Stock Detector (&gt;30 Days)</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Identifies items with zero sales over 15, 30, 60, or 90 days, calculating dormant tied-up working capital.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">3. Top 20 Pareto (80/20) Stars</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Cumulative revenue distribution analysis isolating the top 20% products that generate 80% of store revenue.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">4. Physical Stocktake & Variance</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Audit sheet for physical shelf counts. Computes shrinkage and surplus with 1-click database reconciliation.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">5. Cash Float & Shift (X / Z Read)</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Reconciles shift opening float + cash sales - petty payouts vs physical cash counted, highlighting shortage or surplus.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">6. M-Pesa Statement Reconciler</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Paste statement text or CSV. Regex parses 10-char receipt codes and highlights unbilled payments made to till.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                Modern Executive Daily PDF Generator
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                jsPDF A4
              </span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              Located on the Reports page header. Produces an executive-styled PDF containing:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">● KPI Summary Cards</div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">● Tender Breakdown (Cash/M-Pesa)</div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">● Pareto Bestsellers</div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">● Cashier Shift Audit</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'etims',
      icon: <QrCode className="w-4 h-4 text-amber-500" />,
      title: 'KRA eTIMS VSCU Signing',
      badge: 'Tax',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Electronic Tax Invoice Management System (eTIMS)
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Automatic cryptographic signing and transmission of invoices to Kenya Revenue Authority (KRA).
            </p>
          </div>

          <div className="space-y-3">
            <StepCard n={1} title="Configure VSCU Device Credentials">
              Navigate to <span className="font-bold text-cyan-600 dark:text-cyan-400">Settings &rarr; eTIMS Integration</span>. 
              Enter your KRA PIN, Branch ID, Device Serial Number, and the VSDC control unit service URL.
            </StepCard>

            <StepCard n={2} title="Tax Categorization">
              Products are automatically tagged with KRA tax classes:
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong className="text-slate-900 dark:text-white">Class A</strong>: Exempt goods (basic foodstuffs, medicine).</li>
                <li><strong className="text-slate-900 dark:text-white">Class B</strong>: Standard VAT rate (16.00%).</li>
                <li><strong className="text-slate-900 dark:text-white">Class C</strong>: Zero-Rated exports and supplies (0.00%).</li>
              </ul>
            </StepCard>

            <StepCard n={3} title="Real-Time Thermal QR Signing">
              On every receipt completion, the backend passes line items to the VSCU signer, receives a verified cryptographic invoice hash, 
              and prints the scannable KRA validation QR code directly onto the 80mm receipt.
            </StepCard>
          </div>
        </div>
      )
    },
    {
      id: 'hardware',
      icon: <Printer className="w-4 h-4 text-rose-500" />,
      title: 'Hardware & Peripherals',
      badge: 'Devices',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Printers, Scanners, Cash Drawers & Scales
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Compatible with industry-standard POS hardware across Windows 10/11 and Linux POS environments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-500" />
                Thermal Receipt Printers
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Supports 80mm and 58mm ESC/POS printers via USB, Ethernet/LAN, Bluetooth, and Windows Print Spooler. 
                Auto-cutter commands supported.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-500" />
                Barcode Scanners
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Plug-and-play USB/Bluetooth 1D laser & 2D QR image scanners. Supports weighted supermarket scale barcodes 
                with embedded weight (<code className="font-mono">20WWWWWCCCCCD</code>).
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Automatic Cash Drawers
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Connects via RJ11 cable plugged into the receipt printer. Opens automatically when cash or split payments 
                are finalized.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Connection Health Monitor
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Real-time connection pill in the POS header testing latency against <code className="font-mono">localhost:3000</code> and 
                the Cloudflare Tunnel (<code className="font-mono">api.whizpoint.app</code>).
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'api',
      icon: <Code2 className="w-4 h-4 text-indigo-500" />,
      title: 'REST API & Webhooks',
      badge: 'Developers',
      render: () => (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Developer REST API Reference
            </h2>
            <p className="text-base text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
              Integrate custom ERPs, mobile shopping apps, or external payment gateways with Whiz POS JSON endpoints.
            </p>
          </div>

          <CodeBlock code={`GET /api/v1/sales
Headers:
  Authorization: Bearer <API_TOKEN>
  x-api-key: sk_live_whiz_xxxxxxxxxxxx
  
Response (200 OK):
{
  "status": "success",
  "count": 1,
  "data": [
    {
      "receiptNumber": "TXN1793872633315",
      "totalAmount": 2.00,
      "paymentMethod": "MPESA",
      "mpesaCode": "UK5KZ12T9P",
      "customerName": "Josphat Mburu",
      "createdAt": "2026-11-05T01:57:00.000Z"
    }
  ]
}`} language="json" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">GET</span>
              <div className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-2">/api/v1/sales</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">List receipts with date and outlet filters.</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">POST</span>
              <div className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-2">/api/v1/products</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Upsert catalog items with sequential SKU.</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <span className="font-mono text-xs font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">POST</span>
              <div className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-2">/api/v1/stkpush</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Trigger instant Daraja phone payment prompt.</div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = searchQuery.trim()
    ? sections.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sections;

  const active = sections.find(s => s.id === activeId) ?? sections[0];

  return (
    <div className="pt-28 pb-20 min-h-screen relative overflow-hidden w-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-200">
      
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-bold mb-3">
            <Book className="w-3.5 h-3.5" />
            <span>Official Knowledgebase & Reference Manual</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Whiz POS System Documentation
          </h1>
          <p className="text-base text-slate-700 dark:text-slate-300 max-w-3xl mt-2 leading-relaxed font-normal">
            Exhaustive operational and architectural documentation covering offline SQLite terminals, 
            Safaricom Daraja STK Push, inventory topologies, BI reporting, and KRA eTIMS fiscalization.
          </p>

          {/* Search Bar */}
          <div className="mt-6 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter documentation topics..."
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Layout: Sidebar Navigation + Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Navigation Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1.5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-xl">
              <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                Documentation Chapters
              </div>

              {filteredSections.map(sec => {
                const isActive = sec.id === activeId;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveId(sec.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {sec.icon}
                      <span className="truncate">{sec.title}</span>
                    </div>
                    {sec.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {sec.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Chapter Viewer */}
          <main className="flex-1 min-w-0">
            <div className="p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/95 shadow-sm backdrop-blur-xl">
              {active.render()}
            </div>
          </main>

        </div>

      </div>
    </div>
  );
}
