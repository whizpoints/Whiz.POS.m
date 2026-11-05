import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, Database, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060b14] py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900/90 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="p-6 sm:p-12">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6 mb-8">
            <Link 
              to="/auth" 
              className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Authentication
            </Link>

            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              Data Privacy Certified
            </span>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-sm shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Global Privacy Policy & Data Charter
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                Whizpoint Solutions • Protection Under the Kenya Data Protection Act (KDPA 2019)
              </p>
            </div>
          </div>
          
          <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed mt-8 border-t border-slate-200 dark:border-white/10 pt-8">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <FileText className="w-4 h-4 text-cyan-500" />
                <h2>1. Executive Charter & Privacy Commitment</h2>
              </div>
              <p>
                At <strong>Whiz POS</strong> (developed and operated by Whizpoint Solutions), we recognize that your commercial transaction histories, daily gross receipts, inventory profit margins, and customer databases represent your most sensitive business assets.
              </p>
              <p>
                Our privacy framework is founded upon a strict premise: <strong>we are a pure software service provider, not a data broker</strong>. We never sell, rent, monetize, or utilize tenant sales data for competitive surveillance or third-party advertising.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Database className="w-4 h-4 text-emerald-500" />
                <h2>2. Categories of Information Handled</h2>
              </div>
              <p>
                The platform processes only the minimum data required to facilitate real-time checkout, offline syncing, and fiscal reporting:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-900 dark:text-white">Commercial Transaction Ledgers:</strong> Line-item SKUs, retail pricing, quantities sold, cashier IDs, timestamped receipts, payment tender classifications (Cash, M-Pesa, Card, Credit).</li>
                <li><strong className="text-slate-900 dark:text-white">Payment Rail Telemetry:</strong> Safaricom M-Pesa transaction reference codes (e.g. <code>UK5KZ13A22</code>), customer phone numbers (masked in administrative views), and payer identities for automated receipt association.</li>
                <li><strong className="text-slate-900 dark:text-white">Tenant Identity & Hardware Telemetry:</strong> Business registration names, outlet register designations, local workstation machine IDs, ESC/POS printer status, and Cloudflare Tunnel connection heartbeats.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Lock className="w-4 h-4 text-blue-500" />
                <h2>3. Cryptographic Storage & Multi-Tenant Siloing</h2>
              </div>
              <p>
                Every business operating on Whiz POS is strictly isolated into an independent tenant silo:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-900 dark:text-white">Edge-Local Isolation:</strong> On the physical register, data is committed to an encrypted, zero-latency SQLite edge instance stored locally on the merchant's machine.</li>
                <li><strong className="text-slate-900 dark:text-white">TLS 1.3 Transmission:</strong> All cloud telemetry communicating between edge registers and the central webportal travels exclusively across TLS 1.3 encrypted HTTPS and WSS WebSocket pipes authenticated by Cloudflare Edge SSL.</li>
                <li><strong className="text-slate-900 dark:text-white">Database Encryption:</strong> Offline database backup archives (<code>.wpos</code>) are cryptographically sealed using AES-256 GCM encryption.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <EyeOff className="w-4 h-4 text-rose-500" />
                <h2>4. Zero Third-Party Monetization</h2>
              </div>
              <p>
                Whizpoint Solutions does not track retail consumers across merchants, build behavioral advertising profiles, or share sales turnover figures with competitors, marketing networks, or credit bureaus. 
              </p>
              <p>
                Data is shared strictly with authorized infrastructure partners required to deliver essential functionality (e.g. Safaricom Daraja API for STK push confirmations and KRA eTIMS endpoints for fiscal compliance validation).
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Server className="w-4 h-4 text-indigo-500" />
                <h2>5. Data Retention, Portability & Right to Erasure</h2>
              </div>
              <p>
                You retain complete portability over your business assets. You may export comprehensive Excel or JSON dumps of your entire inventory, customer accounts, and sales history at any time.
              </p>
              <p>
                Upon verified termination of your tenant subscription, your cloud database records are securely scrubbed and permanently overwritten in accordance with NIST 800-88 digital sanitization guidelines. Local workstation copies remain under your sole physical control.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <h2>6. Data Protection Officer (DPO) Contact</h2>
              </div>
              <p>
                For statutory inquiries under the Kenya Data Protection Act (KDPA 2019) or general questions regarding our cryptographic data safeguards:
              </p>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">Whizpoint Solutions Compliance Office:</div>
                <div>Email: <span className="font-mono text-slate-800 dark:text-slate-200">privacy@whizpoint.app</span> | <span className="font-mono text-slate-800 dark:text-slate-200">support@whizpoint.app</span></div>
                <div>Headquarters: Nairobi, Kenya</div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
