import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Building2, ArrowRight, Eye, EyeOff, Search, User, LogOut, CheckCircle2, ShieldCheck, Activity, CreditCard, PieChart } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: ''
  });

  const [activeSession, setActiveSession] = useState<any>(null);

  React.useEffect(() => {
    const existingToken = localStorage.getItem('whiz-token');
    const existingUser = localStorage.getItem('whiz-user');
    if (existingToken && existingUser) {
      try { 
        const userObj = JSON.parse(existingUser);
        setActiveSession(userObj);
      } catch (e) {
        localStorage.removeItem('whiz-token');
        localStorage.removeItem('whiz-user');
      }
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    if (token && userStr) {
      try {
        localStorage.setItem('whiz-token', token);
        localStorage.setItem('whiz-user', userStr);
        toast.success('Successfully logged in!');
        navigate('/dashboard');
      } catch (e) {
        console.error(e);
      }
    }
  }, [navigate]);

  const handleGoogleLogin = () => {
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('whiz-token', data.token);
        localStorage.setItem('whiz-user', JSON.stringify(data.user));
        toast.success(isLogin ? 'Successfully logged in!' : 'Workspace created successfully!', { icon: '👏' });
        navigate('/dashboard');
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (error: any) {
      toast.error('Network error during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out of your WhizPOS account?')) {
      localStorage.removeItem('whiz-token');
      localStorage.removeItem('whiz-user');
      setActiveSession(null);
      toast("You've been signed out successfully.", { icon: '👋' });
    }
  };

  // Modern UI Colors based on Prompt Guidelines
  const colors = {
    primaryNavy: '#07183F',
    darkIndigo: '#151B55',
    primaryBlue: '#0A9EF5',
    brightBlue: '#159FF5',
    cyan: '#6EDCFF',
    purpleAccent: '#8A55FF',
    lightBg: '#F7F9FC',
    border: '#E5EAF2',
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F7F9FC] lg:bg-white font-sans selection:bg-[#0A9EF5]/30 selection:text-white overflow-hidden">
      
      {/* ========================================================= */}
      {/* LEFT PANEL - PREMIUM SAAS BRANDING (DESKTOP) */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12 xl:p-16" 
           style={{ background: `linear-gradient(135deg, ${colors.primaryNavy} 0%, ${colors.darkIndigo} 50%, ${colors.primaryBlue} 100%)` }}>
        
        {/* Animated Glowing Orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full mix-blend-screen filter blur-[100px] animate-pulse" 
               style={{ background: `radial-gradient(circle, ${colors.purpleAccent} 0%, transparent 70%)`, animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full mix-blend-screen filter blur-[120px] animate-pulse" 
               style={{ background: `radial-gradient(circle, ${colors.cyan} 0%, transparent 70%)`, animationDuration: '12s', animationDelay: '2s' }} />
        </div>
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 z-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
            <img src="/logo.png" alt="WhizPOS" className="w-8 h-8 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Whiz<span style={{ color: colors.cyan }}>POS</span></h1>
        </div>

        {/* Marketing Copy & Dashboard Preview */}
        <div className="relative z-10 flex-1 flex flex-col justify-center mt-12 mb-8">
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Your business.<br />
            <span style={{ color: colors.cyan }}>Smarter every day.</span>
          </h2>
          <p className="text-blue-100/80 text-lg xl:text-xl font-medium max-w-md mb-12 leading-relaxed">
            Run sales, inventory, payments and invoicing from one intelligent workspace.
          </p>

          {/* Floating UI Mockup */}
          <div className="relative w-[110%] max-w-[600px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl transform rotate-[-2deg] transition-transform hover:rotate-0 duration-500">
             <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                   <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                   <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <div className="mx-auto w-32 h-2 bg-white/10 rounded-full"></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                   <div className="flex justify-between items-center mb-3">
                     <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Today's Sales</span>
                     <Activity className="w-4 h-4 text-cyan-300" />
                   </div>
                   <div className="text-2xl font-black text-white">KSh 184,520</div>
                   <div className="text-green-300 text-xs font-medium mt-1">+12.5% vs yesterday</div>
                </div>
                <div className="space-y-3">
                   <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="bg-blue-500/30 p-2 rounded-lg text-blue-200"><CreditCard className="w-4 h-4" /></div>
                      <span className="text-white text-sm font-semibold">POS Register</span>
                   </div>
                   <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="bg-purple-500/30 p-2 rounded-lg text-purple-200"><PieChart className="w-4 h-4" /></div>
                      <span className="text-white text-sm font-semibold">Live Reports</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-white/50 text-sm font-medium">
          <span>© {new Date().getFullYear()} WhizPoint</span>
          <span className="w-1 h-1 bg-white/30 rounded-full"></span>
          <span>Enterprise Grade Security</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL - AUTHENTICATION CONTENT */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col p-6 sm:p-12 relative overflow-y-auto bg-[#F7F9FC] lg:bg-white justify-center items-center">
        
        {/* Mobile Header Logo */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2 z-20">
          <div className="w-10 h-10 bg-[#07183F] rounded-[12px] flex items-center justify-center shadow-md">
             <img src="/logo.png" alt="WhizPOS" className="w-6 h-6 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h1 className="text-xl font-black text-[#07183F] tracking-tight">Whiz<span style={{ color: colors.primaryBlue }}>POS</span></h1>
        </div>

        <div className="w-full max-w-[440px] mx-auto pt-16 lg:pt-0 pb-8">
          
          {/* 1. ALREADY SIGNED IN STATE */}
          {activeSession ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-[#F7F9FC] text-[#0A9EF5] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#E5EAF2]">
                     <ShieldCheck className="w-8 h-8" />
                 </div>
                 <h2 className="text-[28px] font-black text-[#10182B] mb-2 tracking-tight">You're already signed in</h2>
                 <p className="text-[#64748B] text-[15px]">There is already an active WhizPOS session on this device.</p>
               </div>

               {/* Session Cards */}
               <div className="space-y-3 mb-8">
                  {/* User Card */}
                  <div className="bg-white border border-[#E5EAF2] rounded-[16px] p-4 flex items-center gap-4 shadow-sm relative overflow-hidden">
                     <div className="w-12 h-12 bg-[#F7F9FC] rounded-full flex items-center justify-center text-[#10182B] font-bold text-lg border border-[#E5EAF2]">
                        {activeSession.name ? activeSession.name.substring(0, 2).toUpperCase() : 'U'}
                     </div>
                     <div className="flex-1">
                        <div className="font-bold text-[#10182B] text-[15px]">{activeSession.name || 'WhizPOS User'}</div>
                        <div className="text-[#64748B] text-[13px]">{activeSession.email}</div>
                     </div>
                     <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-bold tracking-wider uppercase border border-green-100">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Online
                     </div>
                  </div>

                  {/* Business Card */}
                  {activeSession.role && (
                    <div className="bg-white border border-[#0A9EF5]/30 rounded-[16px] p-4 flex items-center gap-4 shadow-[0_4px_12px_rgba(10,158,245,0.08)] relative">
                       <div className="w-12 h-12 bg-[#0A9EF5]/10 text-[#0A9EF5] rounded-[12px] flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                       </div>
                       <div className="flex-1">
                          <div className="font-bold text-[#10182B] text-[15px]">Active Workspace</div>
                          <div className="text-[#64748B] text-[13px] flex items-center gap-2">
                             Business • <span className="uppercase font-bold text-[#0A9EF5]">{activeSession.role}</span>
                          </div>
                       </div>
                       <div className="text-[#0A9EF5]">
                          <CheckCircle2 className="w-6 h-6" />
                       </div>
                    </div>
                  )}
               </div>

               {/* Actions */}
               <div className="flex flex-col gap-3">
                  <button 
                     onClick={() => navigate('/dashboard')} 
                     className="w-full text-white font-semibold text-[15px] h-[54px] rounded-[14px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(10,158,245,0.2)] hover:shadow-[0_12px_24px_rgba(10,158,245,0.3)] hover:-translate-y-0.5 active:scale-[0.98]"
                     style={{ backgroundColor: colors.primaryBlue }}
                  >
                      <span>Continue to Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  {isSwitching ? (
                     <div className="w-full bg-[#F7F9FC] text-[#10182B] font-semibold text-[15px] h-[54px] rounded-[14px] border border-[#E5EAF2] flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-[#0A9EF5] border-t-transparent rounded-full animate-spin"></div>
                        Switching workspace...
                     </div>
                  ) : (
                     <button 
                        onClick={() => {
                          setIsSwitching(true);
                          setTimeout(() => {
                             setIsSwitching(false);
                             toast('Account switching coming soon. Please sign out to change users.', { icon: '🔄' });
                          }, 1000);
                        }} 
                        className="w-full bg-white text-[#10182B] font-semibold text-[15px] h-[54px] rounded-[14px] border border-[#E5EAF2] hover:bg-[#F7F9FC] transition-all active:scale-[0.98]"
                     >
                         Switch Account
                     </button>
                  )}

                  <button 
                     onClick={handleLogout} 
                     className="w-full bg-white text-red-600 font-semibold text-[15px] h-[54px] rounded-[14px] hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
                  >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                  </button>
               </div>
            </div>
          ) : (
            
            /* 2. LOGIN / SIGNUP STATES */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Header Texts */}
              <div className="mb-8">
                <h2 className="text-[28px] sm:text-[32px] font-black text-[#10182B] mb-2 tracking-tight leading-tight">
                  {isLogin ? 'Welcome back' : 'Build your workspace'}
                </h2>
                <p className="text-[#64748B] font-medium text-[15px]">
                  {isLogin ? 'Sign in to your WhizPOS workspace.' : 'Create your WhizPOS account and start managing your business.'}
                </p>
              </div>

              {/* Ultra Modern Mode Switcher */}
              <div className="flex p-1 bg-[#E5EAF2]/40 rounded-[16px] mb-8 relative">
                <div 
                  className="absolute inset-y-1 bg-white rounded-[12px] shadow-sm transition-all duration-300 ease-out" 
                  style={{ width: 'calc(50% - 4px)', left: isLogin ? '4px' : 'calc(50%)' }} 
                />
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setFormData({...formData, businessName: ''}); }}
                  className={`flex-1 py-3 text-[14px] font-bold rounded-[12px] transition-colors relative z-10 ${isLogin ? 'text-[#10182B]' : 'text-[#64748B] hover:text-[#10182B]'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 text-[14px] font-bold rounded-[12px] transition-colors relative z-10 ${!isLogin ? 'text-[#10182B]' : 'text-[#64748B] hover:text-[#10182B]'}`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                
                {/* Business Name Field (Signup Only) */}
                {!isLogin && (
                  <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-300">
                    <label className="text-[13px] font-bold text-[#10182B] ml-1">Business Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-[#64748B] group-focus-within:text-[#0A9EF5] transition-colors" />
                      </div>
                      <input
                        type="text"
                        required
                        className="w-full pl-11 pr-4 py-0 h-[54px] bg-white border border-[#E5EAF2] rounded-[16px] text-[15px] font-medium text-[#10182B] placeholder-[#94A3B8] focus:outline-none focus:border-[#0A9EF5] focus:ring-1 focus:ring-[#0A9EF5] transition-all"
                        placeholder="e.g. Aden Cafe"
                        value={formData.businessName}
                        onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#10182B] ml-1">Work Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[#64748B] group-focus-within:text-[#0A9EF5] transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      className="w-full pl-11 pr-4 py-0 h-[54px] bg-white border border-[#E5EAF2] rounded-[16px] text-[15px] font-medium text-[#10182B] placeholder-[#94A3B8] focus:outline-none focus:border-[#0A9EF5] focus:ring-1 focus:ring-[#0A9EF5] transition-all"
                      placeholder="you@business.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[13px] font-bold text-[#10182B]">Password</label>
                    {isLogin && (
                      <a href="#" className="text-[13px] font-bold text-[#0A9EF5] hover:text-[#159FF5] transition-colors">
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[#64748B] group-focus-within:text-[#0A9EF5] transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      className="w-full pl-11 pr-12 py-0 h-[54px] bg-white border border-[#E5EAF2] rounded-[16px] text-[15px] font-medium text-[#10182B] placeholder-[#94A3B8] focus:outline-none focus:border-[#0A9EF5] focus:ring-1 focus:ring-[#0A9EF5] transition-all"
                      placeholder={isLogin ? '••••••••••••' : 'Create a strong password'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#64748B] hover:text-[#10182B] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {!isLogin && formData.password.length > 0 && formData.password.length < 8 && (
                     <div className="text-red-500 text-[12px] font-medium mt-1.5 ml-1 flex items-center gap-1">
                       Password must be at least 8 characters.
                     </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-white font-semibold text-[15px] h-[54px] rounded-[14px] transition-all flex justify-center items-center gap-2 mt-6 shadow-[0_8px_16px_rgba(10,158,245,0.2)] hover:shadow-[0_12px_24px_rgba(10,158,245,0.3)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none disabled:transform-none"
                  style={{ backgroundColor: colors.primaryBlue }}
                >
                  {isLoading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> {isLogin ? 'Signing you in...' : 'Creating workspace...'}</>
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Workspace'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Social Login Separator */}
                <div className="relative py-4 mt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E5EAF2]"></div>
                  </div>
                  <div className="relative flex justify-center text-[13px]">
                    <span className="bg-[#F7F9FC] lg:bg-white px-4 text-[#64748B] font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-2 bg-white border border-[#E5EAF2] hover:bg-[#F7F9FC] text-[#10182B] font-semibold text-[14px] h-[52px] rounded-[14px] transition-all active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Microsoft login coming soon!', { icon: '💻' })}
                    className="flex items-center justify-center gap-2 bg-white border border-[#E5EAF2] hover:bg-[#F7F9FC] text-[#10182B] font-semibold text-[14px] h-[52px] rounded-[14px] transition-all active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 21 21">
                      <path fill="#f25022" d="M1 1h9v9H1z" />
                      <path fill="#00a4ef" d="M1 11h9v9H1z" />
                      <path fill="#7fba00" d="M11 1h9v9h-9z" />
                      <path fill="#ffb900" d="M11 11h9v9h-9z" />
                    </svg>
                    Microsoft
                  </button>
                </div>
              </form>
              
              {/* Bottom Navigation Toggle */}
              <div className="mt-8 text-center text-[14px] font-medium text-[#64748B]">
                {isLogin ? (
                  <>Don't have an account? <button type="button" onClick={() => setIsLogin(false)} className="text-[#0A9EF5] font-bold hover:text-[#159FF5] transition-colors ml-1">Create your workspace &rarr;</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setIsLogin(true)} className="text-[#0A9EF5] font-bold hover:text-[#159FF5] transition-colors ml-1">Sign in &rarr;</button></>
                )}
              </div>

            </div>
          )}
          
          <div className="mt-12 text-center text-[13px] text-[#64748B] font-medium">
            By proceeding, you agree to our <Link to="/terms" className="font-bold text-[#10182B] hover:text-[#0A9EF5] transition-colors">Terms of Service</Link> and <Link to="/privacy" className="font-bold text-[#10182B] hover:text-[#0A9EF5] transition-colors">Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
