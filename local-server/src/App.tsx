import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Layers,
  ShieldCheck, BarChart3, Menu, X, LogIn,
  Package, Users, UserCog, FileBarChart,
  Search, Bell, Sun, Moon, ChevronDown, Receipt, Warehouse, PieChart,
  Sliders, Server
} from 'lucide-react';
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';


import LocalSetupPage from './pages/LocalSetupPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import NotFound from './pages/NotFound';
import Inventory from './pages/Inventory';
import Categories from './pages/Categories';
import Outlets from './pages/Outlets';
import OutletDetails from './pages/OutletDetails';
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
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<PublicLayout><LocalSetupPage /></PublicLayout>} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/dashboard" element={<DashboardWrapper><Dashboard /></DashboardWrapper>} />
          <Route path="/dashboard/settings" element={<DashboardWrapper><SettingsPage /></DashboardWrapper>} />
          <Route path="/dashboard/inventory" element={<DashboardWrapper><Inventory /></DashboardWrapper>} />
          <Route path="/dashboard/categories" element={<DashboardWrapper><Categories /></DashboardWrapper>} />
          <Route path="/dashboard/sales" element={<DashboardWrapper><Sales /></DashboardWrapper>} />
          <Route path="/dashboard/customers" element={<DashboardWrapper><Customers /></DashboardWrapper>} />
          <Route path="/dashboard/staff" element={<DashboardWrapper><Staff /></DashboardWrapper>} />
          <Route path="/dashboard/suppliers" element={<DashboardWrapper><Suppliers /></DashboardWrapper>} />
          <Route path="/dashboard/reports" element={<DashboardWrapper><Reports /></DashboardWrapper>} />
          <Route path="/dashboard/reconciliation" element={<DashboardWrapper><MpesaReconciliation /></DashboardWrapper>} />
          <Route path="/dashboard/documents" element={<DashboardWrapper><Documents /></DashboardWrapper>} />
          <Route path="/dashboard/outlets" element={<DashboardWrapper><Outlets /></DashboardWrapper>} />
          <Route path="/dashboard/outlets/:id" element={<DashboardWrapper><OutletDetails /></DashboardWrapper>} />
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
  

  useEffect(() => {
    const onScroll = () => {};
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen relative app-shell bg-gray-50 flex items-center justify-center">
      <main className="w-full flex flex-col relative z-10">
        {children}
      </main>
    </div>
  );
}

/* ============================================================
   DASHBOARD LAYOUT (Back office)
============================================================ */
function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { locations, activeLocationId, setActiveLocationId, isLoading } = useBranchContext();

  const user = JSON.parse(localStorage.getItem('whiz-user') || '{}');

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
        { to: '/dashboard/categories', icon: <Layers />, label: 'Categories' },
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
        { to: '/dashboard/outlets', icon: <Server />, label: 'Outlets & Terminals' },
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
    <div className="app-shell flex">
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

      <div className="flex-1 flex flex-col main-with-sidebar min-w-0">
        <div className="app-content flex-1 flex flex-col">
          <header className="topbar">
            <div className="page-title-wrap min-w-0">
              <button className="btn btn-icon btn-secondary sidebar-toggle" onClick={() => setMobileOpen(true)} aria-label="Menu">
                <Menu />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
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

            <div className="topbar-actions">
              <div className="flex items-center gap-2 mr-2">
                {!isLoading && (
                  <select
                    value={activeLocationId}
                    onChange={(e) => setActiveLocationId(e.target.value)}
                    className="border rounded-lg bg-gray-50 p-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Branches</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="search-box hidden md:flex">
                <Search />
                <input placeholder="Search sales, products..." />
              </div>
              <ThemeToggle />
              <button className="btn btn-icon btn-secondary relative" aria-label="Notifications">
                <Bell />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-error)', boxShadow: '0 0 0 2px var(--bg-secondary)' }}></span>
              </button>
              <div className="user-avatar hidden sm:flex" title="Account">
                {user?.name ? user.name.slice(0,2).toUpperCase() : 'AM'}
              </div>
            </div>
          </header>

          <main className="flex-1 no-pad-x">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;







