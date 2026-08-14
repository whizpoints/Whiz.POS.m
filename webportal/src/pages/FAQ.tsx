import { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare, Send } from 'lucide-react';

const faqs = [
  {
    category: 'General',
    items: [
      {
        question: 'Does Whiz POS work offline?',
        answer: 'Yes! Whiz POS is built with an offline-first architecture. If your internet connection drops, you can continue making sales, processing offline cash transactions, and printing receipts. Once you are back online, all data automatically syncs to your web portal dashboard.'
      },
      {
        question: 'What hardware is compatible with Whiz POS?',
        answer: 'Whiz POS works on any Windows PC or laptop. It is compatible with standard USB barcode scanners, thermal receipt printers (via standard Windows drivers), and standard cash drawers.'
      },
      {
        question: 'Can I manage multiple store locations?',
        answer: 'Absolutely. Using this Web Portal, you can manage inventory, staff, and view aggregated or location-specific reports across unlimited registers and store locations from a single dashboard.'
      }
    ]
  },
  {
    category: 'Payments & Compliance',
    items: [
      {
        question: 'How does the M-Pesa STK Push work?',
        answer: 'We provide an integrated M-Pesa STK push mechanism. From the POS, your cashier selects M-Pesa and enters the customer\'s phone number. The system triggers an instant prompt on the customer\'s phone to enter their PIN. Our backend (api.whizpoint.app) listens for the Safaricom callback and automatically marks the receipt as PAID in real-time.'
      },
      {
        question: 'Is Whiz POS compliant with KRA eTIMS?',
        answer: 'Yes, our Professional and Enterprise tiers come with full KRA eTIMS integration, allowing you to automatically generate and push electronic tax invoices seamlessly with every transaction. Simply upload your VSDC credentials in Settings to activate.'
      }
    ]
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<string>('0-0');

  return (
    <div className="pt-32 pb-20 min-h-screen relative overflow-hidden w-full">
      <div className="bg-orb bg-orb-1 opacity-30 animate-pulse-glow"></div>
      <div className="bg-orb bg-orb-2 opacity-30 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-strong text-xs font-semibold mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-[color:var(--accent)]" />
            <span className="text-[color:var(--text-secondary)]">Support Center</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight mb-3 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--text-primary), color-mix(in oklab, var(--accent) 60%, var(--text-primary)))' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-base sm:text-lg text-[color:var(--text-secondary)] max-w-xl mx-auto">
            Everything you need to know about Whiz POS and how it works.
          </p>
        </div>

        {/* FAQ Groups */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '120ms' }}>
          {faqs.map((group, gi) => (
            <div key={gi} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 mb-1">
                <div className="h-0.5 w-6 rounded-full" style={{ background: 'var(--accent-gradient)' }}></div>
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
                  {group.category}
                </h2>
              </div>

              <div className="glass-panel divide-y divide-[color:var(--border-subtle)] overflow-hidden rounded-2xl">
                {group.items.map((faq, fi) => {
                  const key = `${gi}-${fi}`;
                  const isOpen = openIndex === key;
                  return (
                    <div key={fi} className="group">
                      <button
                        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 text-left flex items-center justify-between gap-3 focus:outline-none transition-colors"
                        onClick={() => setOpenIndex(isOpen ? '' : key)}
                      >
                        <span className="font-semibold text-[0.95rem] text-[color:var(--text-primary)] leading-snug pr-2">
                          {faq.question}
                        </span>
                        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isOpen
                            ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]'
                            : 'bg-[color:var(--bg-subtle)] text-[color:var(--text-muted)] group-hover:bg-[color:var(--accent)]/10 group-hover:text-[color:var(--accent)]'
                        }`}>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 sm:px-5 pb-5 -mt-0.5">
                          <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 glass-card rounded-2xl p-5 sm:p-7 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '240ms' }}>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full"
               style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%)', filter: 'blur(8px)' }}></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 25%, transparent), color-mix(in oklab, var(--accent-secondary) 25%, transparent))' }}>
                <MessageSquare className="w-5 h-5 text-[color:var(--accent)]" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-[color:var(--text-primary)] mb-0.5">Still have questions?</h3>
                <p className="text-sm text-[color:var(--text-secondary)]">Our team is here to help you get the most out of Whiz POS.</p>
              </div>
            </div>
            <button className="btn btn-primary shrink-0 self-start sm:self-center inline-flex items-center gap-2">
              <Send className="w-4 h-4" />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
