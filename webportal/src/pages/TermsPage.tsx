import { ArrowLeft, Scale, ShieldAlert, Cpu, Database, Receipt, Lock, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
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

            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">
              Production Release v7.4
            </span>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Terms of Service & Commercial EULA
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                Whizpoint Solutions • Effective Date: November 2026 • Governed under the Laws of Kenya
              </p>
            </div>
          </div>
          
          <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed mt-8 border-t border-slate-200 dark:border-white/10 pt-8">
            
            {/* Section 1 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Cpu className="w-4 h-4 text-cyan-500" />
                <h2>1. Commercial License & Scope of Service</h2>
              </div>
              <p>
                By creating a tenant workspace, downloading the Whiz POS desktop terminal binary, connecting peripheral hardware, or executing transactions across our cloud infrastructure, you enter into a legally binding agreement with <strong>Whizpoint Solutions</strong>.
              </p>
              <p>
                We grant your business a non-exclusive, non-transferable, revocable commercial license to operate the Whiz POS platform across authorized store checkout registers and back-office management terminals. You may not sub-license, reverse-engineer, redistribute, mirror, or repackage the software for third-party commercial exploitation.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Database className="w-4 h-4 text-blue-500" />
                <h2>2. Offline Edge Architecture & Data Sovereignty</h2>
              </div>
              <p>
                Whiz POS is engineered on an <strong>offline-first edge computing architecture (SQLite / LibSQL Edge Native)</strong>. Sales, inventory deduction, shift balancing, and receipt dispatch continue locally without interruption even during internet blackouts.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-900 dark:text-white">Tenant Ownership:</strong> You retain absolute, unencumbered ownership of all commercial data, including customer rosters, inventory costs, and transactional ledgers.</li>
                <li><strong className="text-slate-900 dark:text-white">Local Snapshot Protection:</strong> The terminal provides automated AES-256 encrypted database snapshot routines (<code>.wpos</code>). You are responsible for ensuring physical machine security and creating periodic external disk backups.</li>
                <li><strong className="text-slate-900 dark:text-white">Zero Cloud Lock-in:</strong> You may export full product lists, inventory valuations, and financial audit logs into open Excel/CSV formats at any time.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <h2>3. Payment Telemetry & Financial Non-Custodial Status</h2>
              </div>
              <p>
                Whiz POS provides high-speed telemetric hooks into third-party payment rails, including <strong>Safaricom Daraja M-Pesa (STK Push, C2B Till, Paybill)</strong> and bank PDQ terminals. 
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-900 dark:text-white">Non-Custodial Role:</strong> Whizpoint Solutions is strictly a software technology provider. We are <strong>not a bank, payment processor, or wallet custodian</strong>. Funds paid via M-Pesa or bank transfer deposit directly into your own Safaricom Till or commercial bank account.</li>
                <li><strong className="text-slate-900 dark:text-white">Credential Safeguarding:</strong> You are solely responsible for maintaining the confidentiality of your Daraja consumer secrets, passkeys, and API tokens.</li>
                <li><strong className="text-slate-900 dark:text-white">Transaction Verification:</strong> The system verifies STK callback signatures and C2B transaction codes. However, cash reconciliation and cashier float balancing remain the operational responsibility of the store management.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h2>4. Fiscal Compliance, KRA eTIMS & Anti-Money Laundering (AML)</h2>
              </div>
              <p>
                The platform contains cryptographic fiscal signing modules supporting KRA eTIMS (VSCU/OSCU) protocols and fiscal QR code generation.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-900 dark:text-white">Taxpayer Accuracy:</strong> You are responsible for configuring accurate KRA PINs, VAT tax codes (A, B, C, D, E), and branch identifiers. Whizpoint Solutions disclaims liability for tax penalties resulting from erroneous tenant tax configuration.</li>
                <li><strong className="text-slate-900 dark:text-white">AML Compliance:</strong> You explicitly covenant that your workspace will not be used for money laundering, illicit narcotics trade, counterfeit goods, or sanctions violations. Suspected accounts will be frozen pending law enforcement inquiry.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <Lock className="w-4 h-4 text-indigo-500" />
                <h2>5. System Integrity & Security Audits</h2>
              </div>
              <p>
                All cloud webportal endpoints, tunnel gateways, and terminal APIs are monitored with automated intrusion detection and rate-limiting protocols. Any attempt to exploit injection vulnerabilities, tamper with multi-tenant workspace sharding, spoof webhook receipts, or decompile protected server binaries will trigger permanent account termination and legal prosecution under the Kenya Computer Misuse and Cybercrimes Act.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <h2>6. Support, Subscriptions & Service Level</h2>
              </div>
              <p>
                Cloud backup synchronization, remote webportal management, and telemetric STK callbacks are provided under active subscription tiers. We guarantee 99.9% uptime on our cloud API relay. In the event of upstream network outages (e.g. telecom maintenance), the local POS workstation automatically switches to offline queueing mode.
              </p>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">Whizpoint Solutions Contact Desk:</div>
                <div>Portal: <a href="https://whizpoint.app" className="text-cyan-600 dark:text-cyan-400 underline font-mono">https://whizpoint.app</a></div>
                <div>Technical Support: <span className="font-mono text-slate-800 dark:text-slate-200">support@whizpoint.app</span> | Tel: <span className="font-mono text-slate-800 dark:text-slate-200">+254 740 841 168</span></div>
                <div>Corporate Headquarters: Nairobi, Kenya</div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
