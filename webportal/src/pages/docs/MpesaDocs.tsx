import { useState } from 'react';
import { BookOpen, ShieldCheck, Settings, Smartphone, RefreshCw, Layers, ListChecks, CheckCircle } from 'lucide-react';

const SECTIONS = [
  { id: 'overview', title: '1. Overview', icon: BookOpen },
  { id: 'requirements', title: '2. Requirements', icon: ListChecks },
  { id: 'daraja-setup', title: '3. Daraja Account Setup', icon: Settings },
  { id: 'buy-goods', title: '4. Buy Goods Setup', icon: Smartphone },
  { id: 'paybill', title: '5. PayBill Setup', icon: Smartphone },
  { id: 'stk-push', title: '6. STK Push Flow', icon: Smartphone },
  { id: 'direct-payment', title: '7. Direct Till Payments', icon: RefreshCw },
  { id: 'search', title: '8. Payment Search', icon: RefreshCw },
  { id: 'callbacks', title: '9. Webhook Callbacks', icon: RefreshCw },
  { id: 'recovery', title: '10. Status & Recovery', icon: RefreshCw },
  { id: 'security', title: '11. Security & Isolation', icon: ShieldCheck },
  { id: 'multi-tenant', title: '12. Multi-Tenant Architecture', icon: Layers },
  { id: 'troubleshooting', title: '13. Troubleshooting', icon: ShieldCheck },
  { id: 'checklist', title: '14. Admin Checklist', icon: CheckCircle },
];

export default function MpesaDocs() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-[color:var(--border-subtle)] overflow-y-auto bg-[color:var(--bg-panel)] p-4">
        <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-500" />
          M-Pesa Setup
        </h2>
        <nav className="space-y-1">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-green-500/10 text-green-500 font-medium' 
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.title}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-[color:var(--bg-default)]">
        <div className="max-w-3xl prose prose-sm sm:prose-base dark:prose-invert">
          
          {activeSection === 'overview' && (
            <section>
              <h1>1. Overview</h1>
              <p>The Whiz POS M-Pesa Integration provides a seamless, multi-tenant payment checkout experience connected directly to Safaricom's Daraja API.</p>
              <ul>
                <li><strong>Supported Payment Methods:</strong> STK Push, Direct C2B (PayBill / Buy Goods).</li>
                <li><strong>STK Push:</strong> Pushes a PIN prompt directly to the customer's phone at checkout.</li>
                <li><strong>Buy Goods vs PayBill:</strong> Supports both Till Numbers and PayBill Accounts dynamically.</li>
                <li><strong>Automatic Detection:</strong> Listens for Safaricom webhooks and auto-completes sales when exact amounts match.</li>
                <li><strong>Manual Search:</strong> Cashiers can search for missed transactions by phone number or receipt.</li>
              </ul>
            </section>
          )}

          {activeSection === 'requirements' && (
            <section>
              <h1>2. Requirements</h1>
              <p>Before beginning the setup process, ensure you have the following:</p>
              <ul>
                <li>A Safaricom M-Pesa Merchant Account (Till or PayBill).</li>
                <li>A registered Daraja Developer Account.</li>
                <li><strong>Consumer Key</strong> and <strong>Consumer Secret</strong> from your Daraja App.</li>
                <li><strong>Passkey</strong> (Required for STK Push).</li>
                <li>Your exact <strong>Till Number</strong> or <strong>PayBill Number</strong>.</li>
                <li>Internet connectivity for your POS terminals.</li>
                <li>Production approval from Safaricom (Going Live) to process real funds.</li>
              </ul>
            </section>
          )}

          {activeSection === 'daraja-setup' && (
            <section>
              <h1>3. Daraja Account Setup</h1>
              <p>Follow these steps to configure your Daraja credentials:</p>
              <ol>
                <li>Visit <a href="https://developer.safaricom.co.ke" target="_blank">developer.safaricom.co.ke</a> and log in.</li>
                <li>Navigate to <strong>My Apps</strong> and click <strong>Create New App</strong>.</li>
                <li>Select the <strong>Lipa Na M-Pesa Sandbox</strong> (for testing) or <strong>M-Pesa Express/C2B</strong> (for production).</li>
                <li>Once created, click on your app to view the <strong>Keys</strong> tab.</li>
                <li>Copy your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong>.</li>
                <li>For production, complete the <em>Go Live</em> process on the portal to receive your Production Passkey via email.</li>
              </ol>
            </section>
          )}

          {activeSection === 'buy-goods' && (
            <section>
              <h1>4. Setting Up Buy Goods / Till</h1>
              <p>Buy Goods is the standard "Till Number" where customers simply enter the Till Number and Amount.</p>
              <ul>
                <li><strong>Merchant Type:</strong> Select <code>Buy Goods / Till</code> in the Settings panel.</li>
                <li><strong>Daraja Transaction Type:</strong> The system automatically uses <code>CustomerBuyGoodsOnline</code> for STK pushes.</li>
                <li><strong>Direct Till Payments:</strong> Customers can pay manually; the system monitors the C2B webhook to auto-detect it.</li>
              </ul>
              <div className="bg-[color:var(--bg-subtle)] p-4 rounded-lg mt-4 font-mono text-xs">
                Customer → Till → Safaricom → Whiz POS Webhook → POS Terminal → Cashier Confirms → Sale Completed
              </div>
            </section>
          )}

          {activeSection === 'paybill' && (
            <section>
              <h1>5. Setting Up PayBill</h1>
              <p>PayBill differs from Buy Goods because it requires an <strong>Account Number</strong>.</p>
              <ul>
                <li><strong>Merchant Type:</strong> Select <code>PayBill</code> in the Settings panel.</li>
                <li><strong>Account Reference:</strong> You can define a static account reference (e.g., "StoreName") or leave it blank to auto-generate invoice numbers.</li>
                <li><strong>Daraja Transaction Type:</strong> The system automatically uses <code>CustomerPayBillOnline</code> for STK pushes.</li>
              </ul>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg mt-4 text-yellow-700 dark:text-yellow-400">
                <strong>Note:</strong> Ensure your customers know the correct Account Reference if they are paying manually without STK Push.
              </div>
            </section>
          )}

          {activeSection === 'stk-push' && (
            <section>
              <h1>6. STK Push Flow</h1>
              <p>The STK Push process triggers a PIN prompt on the customer's phone.</p>
              <ol>
                <li>Cashier enters customer phone number in POS.</li>
                <li>Cashier clicks <strong>Send STK Push</strong>.</li>
                <li>Safaricom processes request and sends prompt to phone.</li>
                <li>Customer enters PIN.</li>
                <li>Safaricom processes the funds.</li>
                <li>Safaricom fires the <strong>STK Callback Webhook</strong>.</li>
                <li>Whiz POS records transaction and alerts Cashier.</li>
              </ol>
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mt-4 text-red-700 dark:text-red-400">
                <strong>Important:</strong> An "STK Request Accepted" message only means the prompt was sent. The sale is NOT complete until the final Webhook Callback confirms the funds.
              </div>
            </section>
          )}

          {activeSection === 'direct-payment' && (
            <section>
              <h1>7. Direct Till Payments</h1>
              <p>If a customer pays manually (e.g., via the M-Pesa app) without an STK Push:</p>
              <ol>
                <li>The POS terminal monitors incoming webhooks via the <code>TillMonitor</code> component.</li>
                <li>When the C2B Confirmation Webhook fires, it matches the exact amount due.</li>
                <li>The POS displays the customer's name, phone, and receipt number.</li>
                <li>The cashier verifies and clicks Confirm.</li>
              </ol>
            </section>
          )}

          {activeSection === 'search' && (
            <section>
              <h1>8. Payment Search</h1>
              <p>If automatic detection fails, cashiers can use the manual search fallback.</p>
              <ul>
                <li>Search operates against Whiz POS's synchronized transaction database, NOT directly against Safaricom for every keystroke.</li>
                <li>Cashiers can search by: <strong>Customer Name</strong>, <strong>Phone Number</strong> (e.g., 0740...), or <strong>Receipt Number</strong>.</li>
              </ul>
            </section>
          )}

          {activeSection === 'callbacks' && (
            <section>
              <h1>9. Webhook Callbacks</h1>
              <h3>STK Callback</h3>
              <p>Fires when a customer completes or cancels an STK Push PIN prompt. Saves to the database and alerts the POS.</p>
              <h3>C2B Confirmation</h3>
              <p>Fires when a customer pays manually. Required for Direct Till payments to work. You must click <strong>Register C2B URLs</strong> in Settings to activate this.</p>
              <h3>C2B Validation</h3>
              <p>Fires to validate an incoming payment before Safaricom accepts it. Whiz POS rejects payments where the Shortcode does not match your configuration.</p>
            </section>
          )}

          {activeSection === 'recovery' && (
            <section>
              <h1>10. Transaction Status & Recovery</h1>
              <p>The system is designed to recover from missed callbacks or network failures:</p>
              <ul>
                <li><strong>Delayed Callbacks:</strong> The transaction is saved the moment it arrives, regardless of whether the checkout window is open.</li>
                <li><strong>App Restart:</strong> Cashiers can reopen checkout and use Payment Search to attach a prior transaction to the current sale.</li>
                <li><strong>Offline POS:</strong> Webhooks hit the cloud backend safely. Once the POS reconnects, it fetches the transaction history.</li>
              </ul>
            </section>
          )}

          {activeSection === 'security' && (
            <section>
              <h1>11. Security & Isolation</h1>
              <ul>
                <li><strong>Server-Side Credentials:</strong> Consumer Secret and Passkey are NEVER sent to the browser or POS terminal.</li>
                <li><strong>Tenant Isolation:</strong> Webhooks validate that the incoming Shortcode explicitly matches the tenant's configured Shortcode. Spoofed callbacks to a tenant's URL with another tenant's payload are rejected.</li>
                <li><strong>HTTPS Required:</strong> Production webhooks require a secure HTTPS API domain.</li>
              </ul>
            </section>
          )}

          {activeSection === 'multi-tenant' && (
            <section>
              <h1>12. Multi-Tenant Architecture</h1>
              <p>The entire backend is deeply multi-tenant:</p>
              <div className="bg-[color:var(--bg-subtle)] p-4 rounded-lg font-mono text-sm space-y-2">
                <p>Business A → Config A → Till A → Callback routing A</p>
                <p>Business B → Config B → Till B → Callback routing B</p>
              </div>
              <p className="mt-4">No business can see another business's credentials, transactions, or customers.</p>
            </section>
          )}

          {activeSection === 'troubleshooting' && (
            <section>
              <h1>13. Troubleshooting</h1>
              
              <h4>STK Push not received</h4>
              <p><strong>Cause:</strong> Network delay or invalid passkey.<br/><strong>Fix:</strong> Verify passkey in settings. Ensure phone is turned on.</p>
              
              <h4>STK Push sent but payment not confirmed</h4>
              <p><strong>Cause:</strong> Customer cancelled, insufficient funds, or webhook failed.<br/><strong>Fix:</strong> Use Payment Search to verify. Check Daraja logs for callback errors.</p>
              
              <h4>C2B payment not appearing</h4>
              <p><strong>Cause:</strong> C2B URLs not registered.<br/><strong>Fix:</strong> Go to Settings and click "Register C2B URLs with Safaricom".</p>
              
              <h4>Invalid Shortcode Error</h4>
              <p><strong>Cause:</strong> The shortcode in the webhook does not match your config.<br/><strong>Fix:</strong> Ensure the shortcode in Settings exactly matches the Till/Paybill generating the callback.</p>
            </section>
          )}

          {activeSection === 'checklist' && (
            <section>
              <h1>14. Admin Setup Checklist</h1>
              <div className="space-y-2 text-sm mt-4">
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> M-Pesa merchant account available</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> Buy Goods or PayBill identified</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> Daraja account created & Application generated</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> Consumer Key, Secret, and Passkey configured</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> Merchant number (Till/Paybill) configured</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> API environment selected (Sandbox/Production)</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> C2B registered where applicable</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> STK Push tested</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> Direct payment tested</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded text-green-500" /> Payment search and Sale completion tested</label>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
