import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FileText,
  ShieldCheck, BarChart3, Menu, X, LogIn,
  Package, Users, UserCog, FileBarChart,
  Search, Sun, Moon, ChevronDown, Receipt, Warehouse, PieChart,
  Sliders, Building2
} from 'lucide-react';
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';


import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import OutletsDevices from './pages/OutletsDevices';
import Pricing from './pages/Pricing';
import FAQ from './pages/FAQ';
import Docs from './pages/Docs';
import NotFound from './pages/NotFound';
import Inventory from './pages/Inventory';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyDocument from './pages/VerifyDocument';
import { BranchProvider, useBranchContext } from './context/BranchContext';

import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Staff from './pages/Staff';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import MpesaReconciliation from './pages/MpesaReconciliation';
import MpesaDocs from './pages/docs/MpesaDocs';
import Documents from './pages/Documents';
import { Toaster } from 'react-hot-toast';

function DashboardWrapper({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <BranchProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </BranchProvider>
    </ProtectedRoute>
  );
}

type Theme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('whiz-theme') as Theme | null : null;
    return saved || 'light';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    localStorage.setItem('whiz-theme', theme);
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);
    setResolvedTheme(isDark ? 'dark' : 'light');
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const isDark = mql.matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const cycle = () => {
    setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system');
  };
  return (
    <button
      onClick={cycle}
      className="btn btn-icon btn-secondary"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Moon /> : <Sun />}
    </button>
  );
}

import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('whiz-token');
  
  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  try {
    // Simple JWT decode to check expiry
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token is expired
      console.warn("JWT token expired. Logging out.");
      localStorage.removeItem('whiz-token');
      localStorage.removeItem('whiz-user');
      localStorage.removeItem('whiz-business');
      return <Navigate to="/auth" replace />;
    }
  } catch (e) {
    // Invalid token structure
    console.error("Invalid JWT token format. Logging out.");
    localStorage.removeItem('whiz-token');
    localStorage.removeItem('whiz-user');
    localStorage.removeItem('whiz-business');
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'var(--bg-glass)',
              color: 'var(--text-main)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FAQ /></PublicLayout>} />
          <Route path="/docs" element={<PublicLayout><Docs /></PublicLayout>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/V/:code" element={<PublicLayout><VerifyDocument /></PublicLayout>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardWrapper><Dashboard /></DashboardWrapper></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<DashboardWrapper><SettingsPage /></DashboardWrapper>} />
          <Route path="/dashboard/outlets" element={<DashboardWrapper><OutletsDevices /></DashboardWrapper>} />
          <Route path="/dashboard/inventory" element={<DashboardWrapper><Inventory /></DashboardWrapper>} />
          <Route path="/dashboard/sales" element={<DashboardWrapper><Sales /></DashboardWrapper>} />
          <Route path="/dashboard/customers" element={<DashboardWrapper><Customers /></DashboardWrapper>} />
          <Route path="/dashboard/staff" element={<DashboardWrapper><Staff /></DashboardWrapper>} />
          <Route path="/dashboard/suppliers" element={<DashboardWrapper><Suppliers /></DashboardWrapper>} />
          <Route path="/dashboard/reports" element={<DashboardWrapper><Reports /></DashboardWrapper>} />
          <Route path="/dashboard/reconciliation" element={<DashboardWrapper><MpesaReconciliation /></DashboardWrapper>} />
          <Route path="/dashboard/documents" element={<DashboardWrapper><Documents /></DashboardWrapper>} />
          <Route path="/dashboard/security" element={<DashboardWrapper><SettingsPage /></DashboardWrapper>} />
          <Route path="/dashboard/docs/mpesa" element={<DashboardWrapper><MpesaDocs /></DashboardWrapper>} />

          <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}



/* ============================================================
   PUBLIC LAYOUT (Landing, Auth, Pricing, FAQ, Docs)
============================================================ */
function PublicLayout({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen relative app-shell">
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>

      <nav className={`public-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="public-nav-inner">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="sidebar-logo">
              <img src="/logo.png" alt="Whiz POS" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="sidebar-brand">Whiz <span>POS</span></div>
          </Link>

          <div className="public-nav-links">
            <Link to="/pricing" className="nav-link">Pricing</Link>
            <Link to="/faq" className="nav-link">FAQ</Link>
            <Link to="/docs" className="nav-link">Documentation</Link>
          </div>

          <div className="public-nav-cta">
            <Link to="/auth" className="btn" style={{ background: 'var(--accent-primary)', color: '#fff', height: 36, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', borderRadius: 8 }}>Sign In</Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>



      <main className="min-h-screen flex flex-col relative z-10">
        {children}
      </main>

      <footer className="mt-12 border-t" style={{ borderColor: 'var(--border-glass)' }}>
        <div className="glass-panel rounded-none border-x-0 border-b-0 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="sidebar-logo">
                <img src="/logo.png" alt="Whiz POS" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div>
                <div className="sidebar-brand text-sm">Whiz <span>POS</span></div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Modern Retail Operating System</div>
              </div>
            </div>
            <div className="flex items-center gap-5 flex-wrap justify-center" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              <Link to="/pricing" className="hover:text-[var(--accent-primary)] transition-colors">Pricing</Link>
              <Link to="/faq" className="hover:text-[var(--accent-primary)] transition-colors">FAQ</Link>
              <Link to="/docs" className="hover:text-[var(--accent-primary)] transition-colors">Docs</Link>
              <Link to="/dashboard" className="hover:text-[var(--accent-primary)] transition-colors">Dashboard</Link>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Â© 2026 Whiz POS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   DASHBOARD LAYOUT (Back office)
============================================================ */
function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { locations, activeLocationId, setActiveLocationId, isLoading } = useBranchContext();

  let user: any = {};
  try {
    const uStr = localStorage.getItem('whiz-user');
    if (uStr && uStr !== 'undefined') user = JSON.parse(uStr);
  } catch(e) {}


  const handleLogout = () => {
    localStorage.removeItem('whiz-token');
    localStorage.removeItem('whiz-user');
    navigate('/auth');
  };

  const navGroups = [
    {
      label: 'Main',
      items: [
        { to: '/dashboard', icon: <BarChart3 />, label: 'Overview' },
        { to: '/dashboard/sales', icon: <Receipt />, label: 'Sales & Receipts' },
        { to: '/dashboard/inventory', icon: <Package />, label: 'Inventory' },
        { to: '/dashboard/customers', icon: <Users />, label: 'Customers' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { to: '/dashboard/staff', icon: <UserCog />, label: 'Staff & Roles' },
        { to: '/dashboard/suppliers', icon: <Warehouse />, label: 'Suppliers & PO' },
        { to: '/dashboard/reports', icon: <PieChart />, label: 'Reports' },
        { to: '/dashboard/documents', icon: <FileText />, label: 'Documents' },
        { to: '/dashboard/reconciliation', icon: <FileBarChart />, label: 'M-Pesa Recon' },
      ],
    },
    {
      label: 'System',
      items: [
        { to: '/dashboard/outlets', icon: <Building2 />, label: 'Outlets & Devices' },
        { to: '/dashboard/settings', icon: <Sliders />, label: 'API & Settings' },
        { to: '/dashboard/security', icon: <ShieldCheck />, label: 'API Keys' },
      ],
    },
  ];

  const breadcrumb = (() => {
    const path = location.pathname;
    const crumbs: { label: string; to?: string }[] = [{ label: 'Back Office', to: '/dashboard' }];
    if (path.startsWith('/dashboard')) {
      const seg = path.replace('/dashboard', '').replace(/^\//, '');
      const labelMap: Record<string, string> = {
        '': 'Overview',
        outlets: 'Outlets & Devices',
        settings: 'API & Settings',
        security: 'API Keys',
        inventory: 'Inventory',
        sales: 'Sales & Receipts',
        customers: 'Customers',
        staff: 'Staff & Roles',
        suppliers: 'Suppliers & PO',
        reports: 'Reports',
      };
      if (labelMap[seg]) crumbs.push({ label: labelMap[seg] });
    }
    return crumbs;
  })();

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="sidebar-logo">
              <img src="/logo.png" alt="Whiz POS" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="sidebar-brand">Whiz <span>POS</span></div>
          </Link>
          <button className="btn btn-icon btn-ghost ml-auto sidebar-toggle" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.label}>
              <div className="nav-section">{group.label}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{user?.name ? user.name.slice(0,2).toUpperCase() : 'AM'}</div>
          <div className="user-meta">
            <div className="user-name">{user?.name || 'Business Account'}</div>
            <div className="user-role">{user?.role || 'Admin'}</div>
          </div>
          <button className="btn btn-icon btn-ghost" title="Logout" onClick={handleLogout}>
            <LogIn className="rotate-180" />
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col main-with-sidebar min-w-0 h-screen overflow-y-auto relative">
        <div className="app-content flex-1 flex flex-col">
          <header className="topbar sticky top-0 z-[60] bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm" style={{ padding: "0.75rem 1.5rem" }}>
            <div className="page-title-wrap min-w-0">
              <button className="btn btn-icon btn-secondary sidebar-toggle shrink-0" onClick={() => setMobileOpen(true)} aria-label="Menu">
                <Menu />
              </button>
              <div className="min-w-0">
                <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {breadcrumb.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {c.to ? <Link to={c.to} className="hover:text-[var(--accent-primary)] transition-colors">{c.label}</Link> : <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>}
                      {i < breadcrumb.length - 1 && <ChevronDown style={{ transform: 'rotate(-90deg)', width: 11, height: 11 }} />}
                    </span>
                  ))}
                </div>
                <h1 className="page-title">{breadcrumb[breadcrumb.length - 1].label}</h1>
              </div>
            </div>

            <div className="topbar-actions ml-auto flex shrink-0">
              <div className="flex items-center gap-2 mr-2">
                {!isLoading && (
                  <select
                    value={activeLocationId}
                    onChange={(e) => setActiveLocationId(e.target.value)}
                    className="border rounded-lg bg-gray-50 p-1 md:p-2 text-[11px] md:text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 max-w-[90px] md:max-w-none truncate"
                  >
                    <option value="ALL">All Branches</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="search-box hidden md:flex items-center">
                <Search className="w-4 h-4 shrink-0" />
                <input placeholder="Search sales, products..." className="w-full bg-transparent border-none outline-none text-sm" />
              </div>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="user-avatar border-0 cursor-pointer hover:opacity-80 transition-opacity w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm flex" 
                  title="Account Settings"
                >
                  {user?.name ? user.name.slice(0,2).toUpperCase() : 'AD'}
                </button>
                
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <div className="font-medium text-slate-800 text-sm truncate">{user?.name || 'Admin'}</div>
                        <div className="text-xs text-slate-500 truncate">{user?.email || 'admin@business.com'}</div>
                      </div>
                      <button 
                        onClick={() => { setUserMenuOpen(false); navigate('/dashboard/settings'); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <Sliders className="w-4 h-4" /> Settings
                      </button>
                      <button 
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogIn className="rotate-180 w-4 h-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
              
            </div>
          </header>

          <main className="flex-1 no-pad-x px-4 py-4 md:px-0 md:py-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;








