import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, Activity, Users, Radio, Database, LogOut, Menu, X, ArrowLeft } from 'lucide-react';
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
    { to: '/admin/overview', icon: <Activity className="w-5 h-5" />, label: 'Overview' },
    { to: '/admin/tenants', icon: <Users className="w-5 h-5" />, label: 'Tenants' },
    { to: '/admin/broadcasts', icon: <Radio className="w-5 h-5" />, label: 'Broadcasts' },
    { to: '/admin/security', icon: <Database className="w-5 h-5" />, label: 'Security & R2' },
  ];

  return (
    <div className="min-h-screen bg-[#030914] text-slate-200 font-sans flex flex-col md:flex-row selection:bg-[#00F0FF]/30">
      
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0B1120] border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-white font-black text-lg">
          <ShieldCheck className="text-[#00F0FF] w-6 h-6" /> Whiz<span className="text-[#00F0FF]">Admin</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-400 hover:text-white">
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1120] border-r border-white/5 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <ShieldCheck className="text-[#00F0FF] w-8 h-8" />
          <div>
            <div className="text-white font-black text-xl tracking-tight leading-none">Whiz<span className="text-[#00F0FF]">Admin</span></div>
            <div className="text-[10px] text-[#00F0FF] font-bold uppercase tracking-widest mt-1">God Mode</div>
          </div>
        </div>

        <nav className="mt-6 md:mt-2 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-[#00F0FF]/10 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/5">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-400 py-2.5 rounded-xl hover:text-white hover:bg-white/5 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to POS
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[#FF2A55] py-2.5 rounded-xl hover:bg-[#FF2A55]/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-65px)] md:h-screen w-full relative">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
