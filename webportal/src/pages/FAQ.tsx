import { useState } from 'react';
import {
  ChevronDown, HelpCircle, Search, Zap, CreditCard,
  Boxes, FileBarChart, QrCode, Printer
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  q: string;
  a: string;
  tag?: string;
}

interface FAQCategory {
  category: string;
  icon: any;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    category: 'Architecture & Offline Reliability',
    icon: Zap,
    items: [
      {
        q: 'How does Whiz POS guarantee 100% checkout uptime during internet cuts?',
        a: 'Whiz POS uses a 3-tier offline-first architecture. The Desktop POS register runs an embedded SQLite engine (sqlite-db.cjs) locally on each machine. Transactions, barcode scans, and receipt prints execute locally in under 0.2ms with zero network dependency. When offline, sales queue safely in the local pending_syncs table and automatically synchronize with the Local Shop Server and Cloud Web Portal once connection is restored.'
      },
      {
        q: 'How does the Cloudflare Tunnel (api.whizpoint.app) connect to local port 3000?',
        a: 'The host server runs a persistent Cloudflare Tunnel that maps local port 3000 to the public production endpoint https://api.whizpoint.app with valid enterprise SSL certificates. External webhooks (such as Safaricom Daraja STK Push callbacks) and remote tablet/phone browsers communicate directly with api.whizpoint.app. As long as the port 3000 server is active, all cloud endpoints remain globally accessible.'
      },
      {
        q: 'Can multiple cashier terminals operate simultaneously on the same local network?',
        a: 'Yes. Each physical store runs an in-shop Local Server on port 5050. POS registers discover this server automatically via local LAN mDNS broadcasting. When Cashier A sells an item, the local server broadcasts an instant stock_updated event over local WebSockets, updating Cashier B in real time without touching the public internet.'
      },
      {
        q: 'What happens if a register computer suffers an unexpected power cut?',
        a: 'Because SQLite uses atomic ACID-compliant transactions with Write-Ahead Logging (WAL), any completed sale is permanently written to disk before the receipt cuts. Upon rebooting Windows, the POS terminal immediately loads the last known state and resumes queue synchronization.'
      }
    ]
  },
  {
    category: 'Safaricom M-Pesa STK Push & KYC',
    icon: CreditCard,
    items: [
      {
        q: 'Why was the STK Push taking time or prompting twice, and how was it solved?',
        a: 'STK push delays occur when the backend does not cache OAuth tokens in RAM or encounters high network round-trips. We implemented an in-memory token cache and real-time millisecond stopwatches. Request receipt to Daraja dispatch takes under 420ms. Furthermore, idempotent request locking prevents accidental double-tapping on the register from triggering duplicate prompts.'
      },
      {
        q: 'How does Whiz POS automatically resolve customer names without asking?',
        a: 'Raw Safaricom Daraja STK callbacks by specification do not include customer names. Whiz POS solves this using our multi-tier KYC resolution pipeline: it queries the local POS directory (pos_customer_phone_directory in localStorage), checks the central Customer Directory on api.whizpoint.app, and inspects past C2B receipt matches. Any matching record is automatically formatted from noisy all-caps into clean Title Case (e.g. JOSPHAT NJUGUNA MBURU becomes Josphat Mburu) and remembered for all future sales.'
      },
      {
        q: 'What is the difference between BuyGoods Till (PartyB) and Paybill numbers?',
        a: 'For BuyGoods Tills: the Business Shortcode is your internal Store Number (e.g. 7128505), while PartyB is the public Till Number displayed to shoppers (e.g. 3098707). For Paybills: the Shortcode and PartyB are identical, and Whiz POS automatically passes the invoice number (e.g. INV-73260) as the Account Reference.'
      },
      {
        q: 'How does the M-Pesa Statement Reconciler catch unbilled till payments?',
        a: 'In the Reports hub under "M-Pesa Statement Reconciler", you can paste raw M-Pesa statement text or CSV extracts. Our regex engine parses all 10-character alphanumeric transaction codes (e.g. UK5KZ13A22) and cross-checks them against POS database receipts. It immediately flags unmatched payments — money received at the till that a cashier forgot to ring up.'
      }
    ]
  },
  {
    category: 'Single vs Multi-Outlet Inventory & SKU',
    icon: Boxes,
    items: [
      {
        q: 'I run a single shop — what is the best inventory configuration to prevent double counting?',
        a: 'Single-outlet shops must use Direct Selling: set inventoryMode to "SHARED" and hasCentralStore to false in Settings. In this mode, newly added stock immediately reflects on the register shelves, eliminating Good Received Notes (GRN) friction and ensuring physical shelf stock always matches the system.'
      },
      {
        q: 'When should a business use Central Warehouse + Separate Outlets?',
        a: 'Multi-branch retailers (e.g., businesses with separate shops in Nairobi CBD, Westlands, and Mombasa) should set inventoryMode to "SEPARATE" and enable hasCentralStore. Deliveries arrive at the Central Warehouse via GRN, and stock transfers to satellite branches require an official Transfer Manifest and destination acceptance.'
      },
      {
        q: 'How does Sequential SKU Auto-Generation work during Excel catalog imports?',
        a: 'When importing product catalogs via Excel or CSV with missing or blank SKU cells, Whiz POS automatically generates a collision-free sequential SKU (e.g. PRD-00001, PRD-00002, etc.). It scans existing database keys to guarantee zero sequence collisions.'
      },
      {
        q: 'Can the Excel importer create missing product categories automatically?',
        a: 'Yes. If your spreadsheet contains categories that do not yet exist in your database, Whiz POS automatically creates those categories on the fly and assigns the products to them during the import process.'
      }
    ]
  },
  {
    category: '7 BI Reports & Daily Executive PDF',
    icon: FileBarChart,
    items: [
      {
        q: 'What is the Executive Daily Business Summary PDF report?',
        a: 'It is a multi-section, beautifully formatted A4 executive report generated via jsPDF. Click "Generate Executive Daily PDF" on the Reports page header. It includes KPI summary cards, payment tender breakdowns (Cash, M-Pesa, Card, Credit), top Pareto bestsellers, individual cashier shift audit totals, stock valuation, and tax compliance summary.'
      },
      {
        q: 'What is the Stock Valuation Report (At Cost vs At Selling Price)?',
        a: 'It computes the exact financial capital tied up in inventory. It reports Total Units, Total Asset Value at Cost (what you paid suppliers), Total Value at Retail Selling Price (what you will collect from customers), and the Projected Gross Margin in KES and percentage.'
      },
      {
        q: 'How does the Dead Stock & Slow-Moving Items Report help working capital?',
        a: 'It scans all products and filters for items with zero sales over 15, 30, 60, or 90+ days. It highlights the exact tied-up capital sitting dormant on your shelves so management can launch promotions, bundle slow movers, or negotiate supplier returns.'
      },
      {
        q: 'How does Cash Float & End-of-Shift Reconciliation (X / Z Read) work?',
        a: 'The manager enters the Shift Opening Cash Float and Petty Cash Payouts (e.g., money taken for milk, deliveries). The system calculates Expected Shift Cash (Opening Float + Cash Sales - Petty Payouts). The cashier declares their counted physical cash, and the system instantly flags whether the drawer is Perfectly Balanced, in Shortage, or in Surplus.'
      },
      {
        q: 'How does the Physical Stocktake & Variance Auditor reconcile shelf counts?',
        a: 'Staff enter physical counts per SKU into the audit sheet. The system calculates Discrepancy Units and Variance Value (shrinkage in red, surplus in green). Clicking "Commit Reconciliation" updates the inventory in the database with a full audit log in one click.'
      }
    ]
  },
  {
    category: 'KRA eTIMS Tax Compliance',
    icon: QrCode,
    items: [
      {
        q: 'How does Whiz POS integrate with Kenya Revenue Authority (KRA) eTIMS?',
        a: 'Whiz POS connects directly to KRA VSCU (Virtual Sales Control Unit) middleware. When a sale is finalized, receipt items are cryptographically signed, an official KRA invoice control number is issued, and a scannable verification QR code is printed directly onto the thermal receipt.'
      },
      {
        q: 'What KRA tax classifications are supported?',
        a: 'Whiz POS supports all official KRA tax groups: Class A (Exempt supplies like basic unrefined foodstuffs), Class B (Standard VAT rate of 16.00%), and Class C (Zero-Rated supplies at 0.00%). Each item is categorized in the product catalog and summarized on the receipt footer.'
      },
      {
        q: 'Can eTIMS receipts be printed on standard 80mm thermal receipt printers?',
        a: 'Yes. The cryptographic QR code and invoice verification hash are formatted specifically for standard 80mm ESC/POS thermal paper rolls, ensuring full compliance without requiring specialized proprietary hardware.'
      }
    ]
  },
  {
    category: 'Hardware, Printers, Scanners & Drawers',
    icon: Printer,
    items: [
      {
        q: 'What thermal receipt printers are compatible with Whiz POS?',
        a: 'Whiz POS works with all standard 80mm and 58mm ESC/POS thermal receipt printers across USB, Network/Ethernet (LAN), Bluetooth, and Windows Print Spooler drivers (e.g., Epson, Xprinter, Rongta, Bixolon).'
      },
      {
        q: 'How do automated cash drawers open?',
        a: 'Cash drawers connect to the thermal printer using a standard RJ11 cable. Upon completing a cash transaction, the POS sends an electrical pulse kick command through the printer to instantly pop open the cash drawer.'
      },
      {
        q: 'Does Whiz POS support barcode scanners and weighted supermarket scale barcodes?',
        a: 'Yes. All standard USB and Bluetooth 1D/2D barcode scanners work out of the box with zero drivers. For supermarket butcheries and produce sections, the scanner parses price/weight-embedded scale barcodes (prefix 20 with embedded weight or price).'
      },
      {
        q: 'What is the Connection Health Pill in the POS header?',
        a: 'The header features a live status pill that pings local port 3000 and the public Cloudflare tunnel (https://api.whizpoint.app) in real time. Clicking the pill displays latency metrics, tunnel reachability, and diagnostic guidance for M-Pesa webhook health.'
      }
    ]
  }
];

export default function FAQ() {
  const [openKey, setOpenKey] = useState<string>('0-0');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = faqData.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="pt-28 pb-20 min-h-screen relative overflow-hidden w-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-200">
      
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support & Operational Knowledgebase</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h1>

          <p className="text-base text-slate-800 dark:text-slate-200 mt-3 leading-relaxed font-normal">
            Everything you need to know about offline POS resilience, Safaricom Daraja STK Push, 
            inventory configurations, 7 BI reports, and KRA eTIMS compliance.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. STK push, offline, stocktake)..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white shadow-sm"
            />
          </div>
        </div>

        {/* Categories & Accordion */}
        <div className="space-y-8">
          {filteredData.map((group, gi) => {
            const Icon = group.icon;
            return (
              <div key={gi} className="space-y-3">
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {group.category}
                  </h2>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 divide-y divide-slate-100 dark:divide-white/5 shadow-sm overflow-hidden">
                  {group.items.map((item, ii) => {
                    const key = `${gi}-${ii}`;
                    const isOpen = openKey === key;
                    return (
                      <div key={ii} className="transition-colors">
                        <button
                          onClick={() => setOpenKey(isOpen ? '' : key)}
                          className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 focus:outline-none cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {item.q}
                          </span>
                          <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-all ${
                            isOpen 
                              ? 'bg-cyan-500 text-white' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-4 sm:px-5 pb-5 pt-1 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal animate-in fade-in duration-200">
                            <p>{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredData.length === 0 && (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-slate-900 dark:text-white text-base">No matching questions found</div>
              <p className="text-xs text-slate-500 mt-1">Try searching for keywords like "offline", "STK", "inventory", or "eTIMS".</p>
            </div>
          )}
        </div>

        {/* Contact Banner */}
        <div className="mt-14 p-6 sm:p-8 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Have a specific retail question?</h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-0.5">
              Our engineering and retail onboarding team is available 24/7 for custom integrations and store deployment.
            </p>
          </div>
          <Link
            to="/docs"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 whitespace-nowrap"
          >
            Explore System Docs &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
