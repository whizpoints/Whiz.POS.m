import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Zap, Shield, CircleDollarSign, Globe2, Server, Sparkles } from 'lucide-react';

const features = [
  {
    icon: <Zap />,
    title: 'Lightning Fast',
    desc: 'Offline-first architecture keeps your cashiers moving — never wait on loading spinners.',
    color: 'var(--accent-primary)',
  },
  {
    icon: <Shield />,
    title: 'Bank-Grade Security',
    desc: 'API keys, M-Pesa Consumer secrets, and PINs are encrypted end-to-end with SHA-256.',
    color: 'var(--accent-secondary)',
  },
  {
    icon: <BarChart3 />,
    title: 'Advanced Analytics',
    desc: 'Real-time Z-reports, inventory forecasting, and live multi-store dashboards.',
    color: 'var(--accent-tertiary)',
  },
  {
    icon: <CircleDollarSign />,
    title: 'M-Pesa STK Push',
    desc: 'Integrated Daraja flows with instant receipt marking — no manual confirmation.',
    color: 'var(--accent-warning)',
  },
  {
    icon: <Globe2 />,
    title: 'Multi-Tenant',
    desc: 'Manage unlimited store locations from one back-office — from Kisumu to Nairobi.',
    color: '#ec4899',
  },
  {
    icon: <Server />,
    title: 'eTIMS Compliant',
    desc: 'Professional & Enterprise tiers include automatic KRA electronic tax invoice signing.',
    color: '#06b6d4',
  },
];

const pricingBar = [
  { label: '500+', sub: 'Active Registers' },
  { label: '0ms', sub: 'Local Latency' },
  { label: '99.9%', sub: 'API Uptime' },
  { label: 'KSh 2.4B+', sub: 'Processed' },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden w-full">
      <section className="hero-section">
        <div className="bg-orb bg-orb-3"></div>
        <div className="hero-grid">
          <div className="animate-in">
            <div className="hero-kicker">
              <span className="hero-kicker-dot"></span>
              Whiz POS 7.1 is now live · <Sparkles style={{ width: 13, height: 13 }} /> AI Insights
            </div>

            <h1 className="hero-title">
              The Operating System for{' '}
              <span className="text-gradient">Modern Retailers.</span>
            </h1>

            <p className="hero-subtitle">
              Unify your offline point-of-sale and cloud back office in one ultra-modern platform.
              Process M-Pesa STK Pushes, track inventory across stores, and manage your staff —
              all with zero latency on the terminal.
            </p>

            <div className="hero-cta">
              <Link to="/auth?signup=true" className="btn btn-primary btn-lg">
                Start Free Trial <ArrowRight />
              </Link>
              <Link to="/docs" className="btn btn-secondary btn-lg">
                View Documentation
              </Link>
            </div>

            <div className="hero-stats">
              {pricingBar.map(s => (
                <div key={s.label}>
                  <div className="hero-stat-num">{s.label}</div>
                  <div className="hero-stat-label">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-in" style={{ animationDelay: '120ms' }}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[32px] blur-3xl opacity-40" style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-tertiary))'
              }}></div>
              <div className="glass-strong relative z-10 p-4 rounded-[28px] animate-float">
                <div className="rounded-[20px] p-4 border" style={{
                  background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary))',
                  borderColor: 'var(--border-glass-strong)',
                }}>
                  {/* Mock dashboard header */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: 'var(--border-glass)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="sidebar-logo" style={{ width: 30, height: 30 }}>
                        <img src="/logo.png" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Live Dashboard</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Acme Supermarket · 3 registers</div>
                      </div>
                    </div>
                    <div className="badge badge-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-[currentColor] animate-pulse"></span>
                      Online
                    </div>
                  </div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { l: 'Revenue', v: 'KES 39.7k', d: '+12.5%', c: 'var(--accent-primary)' },
                      { l: 'M-Pesa', v: 'KES 27.3k', d: '+8.2%', c: 'var(--accent-tertiary)' },
                      { l: 'Txns', v: '234', d: '+18%', c: 'var(--accent-secondary)' },
                      { l: 'Customers', v: '118', d: '+5.4%', c: 'var(--accent-warning)' },
                    ].map((k, i) => (
                      <div key={i} className="glass-subtle p-3" style={{ borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.l}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: '3px 0' }}>{k.v}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: k.c }}>▲ {k.d}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini receipt list */}
                  <div className="space-y-2">
                    {[
                      { n: 'Jane Wanjiru', m: 'M-Pesa', a: 'KES 1,240', s: 'Paid' },
                      { n: 'Walk-in Customer', m: 'Cash', a: 'KES 480', s: 'Paid' },
                      { n: 'Peter Kamau', m: 'M-Pesa', a: 'KES 3,890', s: 'Paid' },
                    ].map((t, i) => (
                      <div key={i} className="glass-subtle p-2.5 flex items-center gap-2.5" style={{ borderRadius: 'var(--radius-md)' }}>
                        <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                          {t.n.split(' ').map(s => s[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.n}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.m}</div>
                        </div>
                        <div className="font-tabular font-semibold" style={{ fontSize: 11.5 }}>{t.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-24 relative">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="hero-kicker mx-auto mb-4">
              <Sparkles style={{ width: 13, height: 13 }} /> One Platform · Everything Retail
            </div>
            <h2 className="hero-title text-center" style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', marginBottom: 12 }}>
              Everything you need to <span className="text-gradient">scale</span>.
            </h2>
            <p style={{ fontSize: 'clamp(14px, 1.5vw, 17px)', color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto' }}>
              Whiz POS replaces 5 different tools with one seamlessly integrated retail operating system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass-card p-5 group"
                style={{
                  animation: `slide-up .5s cubic-bezier(.4,0,.2,1) both`,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div
                  className="kpi-icon-wrap mb-4 group-hover:scale-110 transition-transform"
                  style={{
                    width: 44,
                    height: 44,
                    background: `color-mix(in oklab, ${f.color} 16%, transparent)`,
                    color: f.color,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: 6,
                }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-4 pb-20">
        <div className="w-full max-w-6xl mx-auto glass-strong p-8 md:p-12 rounded-[28px] relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-40" style={{ background: 'var(--accent-primary)' }}></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: 'var(--accent-tertiary)' }}></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Ready to take your retail <span className="text-gradient">to the next level?</span>
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6 }}>
                Join 500+ stores already running on Whiz POS. 14-day free trial, no credit card required.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/auth?signup=true" className="btn btn-primary btn-lg">Create Free Account <ArrowRight /></Link>
              <Link to="/pricing" className="btn btn-secondary btn-lg">View Pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
