import { Link } from 'react-router-dom';
import { Home, LayoutDashboard, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-3 sm:px-4 py-16">
      <div className="bg-orb bg-orb-1 opacity-40 animate-pulse-glow"></div>
      <div className="bg-orb bg-orb-2 opacity-40 animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="glass-card rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          {/* Decorative gradient top band */}
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'var(--accent-gradient)' }}></div>
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-60 pointer-events-none"
               style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 30%, transparent), transparent 70%)', filter: 'blur(10px)' }}></div>
          <div className="absolute -bottom-24 -left-20 w-60 h-60 rounded-full opacity-50 pointer-events-none"
               style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent-secondary) 30%, transparent), transparent 70%)', filter: 'blur(10px)' }}></div>

          {/* Giant 404 */}
          <div className="relative mb-2 animate-float" style={{ animationDuration: '6s' }}>
            <h1
              className="font-heading font-black leading-none text-transparent bg-clip-text tracking-tight"
              style={{
                fontSize: 'clamp(5.5rem, 18vw, 10rem)',
                backgroundImage: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 60%, color-mix(in oklab, var(--accent-secondary) 40%, var(--accent)) 100%)',
                filter: 'drop-shadow(0 18px 40px color-mix(in oklab, var(--accent) 25%, transparent))'
              }}
            >
              404
            </h1>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)] mt-2">
            Page not found
          </h2>
          <p className="text-sm sm:text-base text-[color:var(--text-secondary)] mt-2.5 max-w-md mx-auto leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>

          {/* Quick search */}
          <div className="mt-6 max-w-sm mx-auto">
            <div className="search-box glass-strong">
              <Search className="w-4 h-4 text-[color:var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search for products, sales, customers…"
                className="flex-1 bg-transparent outline-none text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-[color:var(--text-muted)] border border-[color:var(--border-subtle)]">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link to="/" className="btn btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <Home className="w-4 h-4 hidden sm:block" />
              Go to Homepage
            </Link>
            <Link to="/dashboard" className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Open Dashboard
            </Link>
          </div>

          {/* Quick links */}
          <div className="mt-8 pt-5 border-t border-[color:var(--border-subtle)]">
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[color:var(--text-muted)] mb-3">
              Try these instead
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { label: 'Inventory', to: '/dashboard/inventory' },
                { label: 'Sales', to: '/dashboard/sales' },
                { label: 'Reports', to: '/dashboard/reports' },
                { label: 'Settings', to: '/dashboard/settings' },
                { label: 'Pricing', to: '/pricing' },
                { label: 'Docs', to: '/docs' },
                { label: 'FAQ', to: '/faq' }
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="chip !py-1.5 !px-3 text-xs font-medium hover:!border-[color:var(--accent)]/40 hover:!text-[color:var(--accent)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
