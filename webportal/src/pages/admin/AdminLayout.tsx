import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, Users, Radio, Database, LogOut, Menu, X, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('whiz-user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (!u.isSuperAdmin) {
        navigate('/dashboard'); // Kick non-admins out
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('whiz-token');
    localStorage.removeItem('whiz-user');
    navigate('/auth');
    toast("God mode deactivated.", { icon: '🔒' });
  };

  const navItems = [
    { to: '/admin/overview', icon: <Activity className="w-5 h-5" />, label: 'Dashboard' },
    { to: '/admin/tenants', icon: <Users className="w-5 h-5" />, label: 'Tenants & Users' },
    { to: '/admin/broadcasts', icon: <Radio className="w-5 h-5" />, label: 'Email Broadcasts' },
    { to: '/admin/security', icon: <Database className="w-5 h-5" />, label: 'Security & Backups' },
  ];

  return (
    <div className="min-h-screen bg-[#060B08] text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden relative" style={{ backgroundColor: '#060B08' }}>
      
      {/* Background Ambient Glow for True Glassmorphism */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0A9EF5]/20 rounded-full mix-blend-screen filter blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-[#8A55FF]/20 rounded-full mix-blend-screen filter blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-[#10B981]/20 rounded-full mix-blend-screen filter blur-[130px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0A100D]/60 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">G</div>
          <div className="text-white font-bold text-lg tracking-tight">Whiz<span className="text-emerald-400">Dash</span></div>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-400 hover:text-white">
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white/[0.05] backdrop-blur-3xl border-r border-white/10 shadow-[8px_0_32px_rgba(0,0,0,0.3)] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 hidden md:flex items-center gap-3 z-10 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold text-white text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">G</div>
          <div>
            <div className="text-white font-bold text-xl tracking-tight leading-none">Whiz<span className="text-emerald-400 font-normal">Dash</span></div>
          </div>
        </div>

        <div className="px-6 py-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 ml-2">Main Menu</p>
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[14px] font-medium transition-all ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`${item.to === '/admin/overview' ? 'text-white' : ''}`}>{item.icon}</div>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 ml-2">Account</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors mb-2"
          >
            <ArrowLeft className="w-5 h-5" /> Back to POS
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>

          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-bold text-white text-sm">
              TM
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Administrator</div>
              <div className="text-[11px] text-slate-400 truncate">admin@whizpoint.app</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-65px)] md:h-screen w-full relative z-10">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
