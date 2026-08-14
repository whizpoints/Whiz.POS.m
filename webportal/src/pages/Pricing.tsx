import { useState } from 'react';
import { CheckCircle2, Sparkles, Zap, Shield, BarChart3, ArrowRight, Building2, Store, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const tiers = [
    {
      name: 'Starter',
      icon: <Store />,
      price: isAnnual ? '999' : '1,200',
      save: isAnnual ? 'Save 17%' : null,
      description: 'Perfect for single-register retail shops just getting started.',
      features: [
        '1 Store Location',
        'Unlimited Offline Sales',
        'Basic M-Pesa Integration',
        '7-Day Sales History',
        'Email Support',
        'Standard Receipt Printing',
      ],
      highlighted: false,
      cta: 'Start Free Trial',
      accent: 'var(--accent-secondary)',
    },
    {
      name: 'Professional',
      icon: <Building2 />,
      price: isAnnual ? '2,499' : '3,000',
      save: isAnnual ? 'Save 17%' : null,
      description: 'For growing businesses with multiple registers and inventory needs.',
      features: [
        'Up to 5 Registers',
        'Advanced Inventory Tracking',
        'eTIMS KRA Integration',
        'Automated STK Push',
        'Unlimited History',
        'Customer CRM & Loyalty',
        'Priority 24/7 Support',
        'Z-Reports & Analytics',
      ],
      highlighted: true,
      cta: 'Get Professional',
      accent: 'var(--accent-primary)',
    },
    {
      name: 'Enterprise',
      icon: <Rocket />,
      price: 'Custom',
      save: null,
      description: 'For large chains and franchises with unlimited locations.',
      features: [
        'Unlimited Locations',
        'Custom Hardware Setup',
        'Dedicated Account Manager',
        'Advanced API Access',
        'Custom Analytics & BI',
        'SLA-backed 99.99% Uptime',
        'On-site Implementation',
        'Multi-region Deployment',
      ],
      highlighted: false,
      cta: 'Contact Sales',
      accent: 'var(--accent-tertiary)',
    },
  ];

  const faqs = [
    { q: 'Can I switch plans at any time?', a: 'Absolutely. Upgrade or downgrade from your Billing dashboard with just a few clicks. Changes are prorated.' },
    { q: 'Do you offer a free trial?', a: 'Yes. Every plan includes a 14-day free trial with no credit card required. Cancel anytime.' },
    { q: 'How is M-Pesa billed?', a: 'M-Pesa transaction fees are billed directly by Safaricom. We do not mark up payment processing fees.' },
  ];

  return (
    <div className="pt-32 pb-20 relative overflow-hidden w-full">
      <div className="bg-orb bg-orb-1 opacity-30"></div>
      <div className="bg-orb bg-orb-2 opacity-25"></div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10 animate-in">
          <div className="hero-kicker mx-auto mb-4">
            <Sparkles style={{ width: 13, height: 13 }} />
            Simple, transparent pricing
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            marginBottom: 12,
          }}>
            Pricing that grows <span className="text-gradient">with you.</span>
          </h1>
          <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            No hidden fees. No surprise charges. Choose the plan that best fits your retail business today.
          </p>

          {/* Billing toggle */}
          <div className="mt-7 inline-flex items-center gap-3 glass-subtle p-1.5 rounded-[var(--radius-full)]">
            <button
              onClick={() => setIsAnnual(false)}
              className="px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-semibold transition-all"
              style={{
                background: !isAnnual ? 'var(--bg-secondary)' : 'transparent',
                color: !isAnnual ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: !isAnnual ? 'var(--shadow-glass)' : 'none',
                border: !isAnnual ? '1px solid var(--border-glass-strong)' : '1px solid transparent',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className="px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-semibold transition-all flex items-center gap-1.5"
              style={{
                background: isAnnual ? 'var(--bg-secondary)' : 'transparent',
                color: isAnnual ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isAnnual ? 'var(--shadow-glass)' : 'none',
                border: isAnnual ? '1px solid var(--border-glass-strong)' : '1px solid transparent',
              }}
            >
              Annually
              <span className="badge badge-success" style={{ padding: '1px 6px', fontSize: 10 }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-5 items-stretch mb-16">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className="glass-strong rounded-[24px] relative flex flex-col animate-in"
              style={{
                border: tier.highlighted
                  ? `1px solid color-mix(in oklab, ${tier.accent} 45%, var(--border-glass-strong))`
                  : '1px solid var(--border-glass-strong)',
                boxShadow: tier.highlighted
                  ? `0 20px 60px -20px color-mix(in oklab, ${tier.accent} 55%, transparent), var(--shadow-glass-lg)`
                  : 'var(--shadow-glass)',
                animationDelay: `${i * 80}ms`,
                transform: tier.highlighted ? 'translateY(0)' : undefined,
              }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none">
                {tier.highlighted && (
                  <div
                    className="absolute -top-14 -right-14 w-52 h-52 rounded-full blur-3xl opacity-40"
                    style={{ background: tier.accent }}
                  ></div>
                )}
              </div>

              {tier.highlighted && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider z-20"
                  style={{
                    background: `linear-gradient(135deg, ${tier.accent}, var(--accent-tertiary))`,
                    color: '#fff',
                    boxShadow: `0 4px 14px color-mix(in oklab, ${tier.accent} 45%, transparent)`,
                  }}
                >
                  Most Popular
                </div>
              )}

              <div className="relative z-10 p-6 flex flex-col flex-1 h-full">
                <div
                  className="kpi-icon-wrap mb-4"
                  style={{
                    width: 44,
                    height: 44,
                    background: `color-mix(in oklab, ${tier.accent} 16%, transparent)`,
                    color: tier.accent,
                  }}
                >
                  {tier.icon}
                </div>

                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  marginBottom: 4,
                }}>{tier.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', minHeight: 36, lineHeight: 1.5 }}>{tier.description}</p>

                <div className="flex items-end gap-1 my-5">
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {tier.price === 'Custom' ? 'Custom' : `KES ${tier.price}`}
                  </span>
                  {tier.price !== 'Custom' && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', paddingBottom: 5 }}>/mo</span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5" style={{ fontSize: 13 }}>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `color-mix(in oklab, ${tier.accent} 15%, transparent)`, color: tier.accent }}
                      >
                        <CheckCircle2 style={{ width: 13, height: 13 }} />
                      </div>
                      <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth?signup=true"
                  className={`btn ${tier.highlighted ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={{ marginTop: 'auto' }}
                >
                  {tier.cta}
                  <ArrowRight />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Feature matrix teaser */}
        <section className="mb-16">
          <div className="glass-strong rounded-[24px] p-6 md:p-8 overflow-hidden relative">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: 'var(--accent-tertiary)' }}></div>

            <div className="relative z-10 grid md:grid-cols-3 gap-5">
              {[
                { icon: <Zap />, title: 'Lightning Performance', desc: '0ms local latency. Your cashiers will never wait for a spinner.', c: 'var(--accent-primary)' },
                { icon: <Shield />, title: 'Bank-Grade Security', desc: 'All sensitive credentials encrypted with AES-256 at rest and in transit.', c: 'var(--accent-secondary)' },
                { icon: <BarChart3 />, title: 'Advanced Analytics', desc: 'Real-time dashboards, Z-reports, and AI-powered forecasting built in.', c: 'var(--accent-tertiary)' },
              ].map(f => (
                <div key={f.title} className="glass-subtle p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                  <div
                    className="kpi-icon-wrap mb-3"
                    style={{ width: 40, height: 40, background: `color-mix(in oklab, ${f.c} 16%, transparent)`, color: f.c }}
                  >
                    {f.icon}
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 5 }}>{f.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Small FAQ */}
        <section className="max-w-3xl mx-auto">
          <div className="text-center mb-7">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 6 }}>
              Frequently asked
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              More questions? <Link to="/faq" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Visit our full FAQ →</Link>
            </p>
          </div>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <details key={i} className="glass-panel overflow-hidden group" style={{ borderRadius: 'var(--radius-lg)' }}>
                <summary className="cursor-pointer list-none flex items-center justify-between p-4 gap-3 hover:bg-[color-mix(in_oklab,var(--accent-primary)_4%,transparent)] transition-colors">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{f.q}</span>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-open:rotate-45"
                    style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>+</span>
                  </span>
                </summary>
                <div style={{ padding: '0 16px 16px 16px', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
