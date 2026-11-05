import { resetPosStore } from '../store/posStore';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Mail, Lock, Building2, ArrowRight, Eye, EyeOff, LogOut,
  ShieldCheck, Sun, Moon, Sparkles, Smartphone,
  Zap, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../App';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme, resolvedTheme } = useTheme();

  // Search parameters for auth actions
  const searchParams = new URLSearchParams(window.location.search);
  const isSuspended = searchParams.get('suspended') === 'true';

  // Toggle signup mode if ?signup=true in query
  useEffect(() => {
    if (searchParams.get('signup') === 'true') {
      setIsLogin(false);
    }
  }, []);

  // Return URL persistence
  useEffect(() => {
    let returnUrl = '/dashboard';
    if (location.state?.from) {
      returnUrl = typeof location.state.from === 'string'
        ? location.state.from
        : `${location.state.from.pathname}${location.state.from.search || ''}`;
      sessionStorage.setItem('whiz-return-url', returnUrl);
    }
  }, [location.state]);

  const getReturnUrl = () => sessionStorage.getItem('whiz-return-url') || '/dashboard';

  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: ''
  });

  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
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
        localStorage.removeItem('pos-store');
        resetPosStore();
        localStorage.setItem('whiz-token', token);
        localStorage.setItem('whiz-user', userStr);
        toast.success('Successfully logged in!');
        const parsed = JSON.parse(userStr);
        if (parsed?.isSuperAdmin) {
          navigate('/admin');
        } else {
          navigate(getReturnUrl(), { replace: true });
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [navigate]);

  const handleGoogleLogin = () => {
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);
    const authUrl = `${API_BASE_URL}/api/auth/google`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      authUrl,
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        const { token, user } = event.data;
        localStorage.removeItem('pos-store');
        resetPosStore();
        localStorage.setItem('whiz-token', token);
        localStorage.setItem('whiz-user', JSON.stringify(user));
        toast.success('Successfully logged in with Google!', { icon: '👏' });
        window.removeEventListener('message', messageListener);
        if (user?.isSuperAdmin) {
          navigate('/admin');
        } else {
          navigate(getReturnUrl(), { replace: true });
        }
      }
    };

    window.addEventListener('message', messageListener);
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
        localStorage.removeItem('pos-store');
        resetPosStore();
        localStorage.setItem('whiz-token', data.token);
        localStorage.setItem('whiz-user', JSON.stringify(data.user));
        toast.success(isLogin ? 'Successfully logged in!' : 'Workspace created successfully!', { icon: '👏' });
        if (data.user?.isSuperAdmin) {
          navigate('/admin');
        } else {
          navigate(getReturnUrl(), { replace: true });
        }
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
    localStorage.removeItem('whiz-token');
    localStorage.removeItem('whiz-user');
    setActiveSession(null);
    setShowLogoutConfirm(false);
    toast("You've been signed out successfully.", { icon: '👋' });
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col lg:flex-row relative font-sans transition-colors duration-300 ${
      isDark ? 'bg-[#030712] text-white selection:bg-cyan-500/30' : 'bg-slate-50 text-slate-900 selection:bg-blue-500/20'
    }`}>

      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-25 ${
          isDark ? 'bg-cyan-600' : 'bg-blue-400'
        }`} />
        <div className={`absolute top-1/2 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 ${
          isDark ? 'bg-indigo-600' : 'bg-indigo-300'
        }`} />
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* LEFT PANEL: DESKTOP BRANDING SHOWCASE (HIDDEN ON MOBILE) */}
      {/* ========================================================================= */}
      <div className={`hidden lg:flex lg:w-1/2 relative z-10 p-12 xl:p-16 flex-col justify-between border-r ${
        isDark ? 'border-white/10 bg-slate-950/40 backdrop-blur-2xl' : 'border-slate-200 bg-white/70 backdrop-blur-2xl'
      }`}>
        {/* Brand Top Header */}
        <Link to="/" className="flex items-center gap-3 group self-start">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center p-2 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Whiz POS" className="w-full h-full object-contain brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
              Whiz <span className="text-cyan-500">POS</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-700 dark:text-slate-300 mt-1">
              Retail Intelligence OS
            </div>
          </div>
        </Link>

        {/* Hero Narrative Block */}
        <div className="space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Tenant Back Office v7.4</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
            Unify your offline registers and cloud back office.
          </h1>

          <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            Automated M-Pesa STK callbacks, sub-millisecond local checkout registers, KRA eTIMS signing, and real-time multi-store inventory.
          </p>

          {/* Quick Value Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-100/70 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                <Smartphone className="w-4 h-4" />
                <span>Instant STK Push</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                420ms Daraja response with customer KYC memory.
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-100/70 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Zap className="w-4 h-4" />
                <span>Offline Engine</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Zero spinner delay. Never halt sales during internet cuts.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Stamp */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <span>&copy; {new Date().getFullYear()} Whizpoint Solutions</span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            Bank-Grade SHA-256
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: MOBILE-FRIENDLY AUTH FORM CARD */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-center items-center py-8 px-4 sm:p-6 lg:p-12 relative z-10 w-full min-h-[100dvh] overflow-y-auto">
        
        {/* Mobile Header Bar */}
        <div className="w-full max-w-md flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center p-1.5 shadow-md">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
              Whiz <span className="text-cyan-500">POS</span>
            </span>
          </Link>

          {/* Theme Quick Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-white/15 text-yellow-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Central Auth Monolith Container */}
        <div className={`w-full max-w-md rounded-3xl p-5 sm:p-8 border shadow-xl backdrop-blur-2xl transition-all ${
          isDark 
            ? 'bg-slate-900/90 border-white/10 shadow-2xl text-white' 
            : 'bg-white/95 border-slate-200 shadow-slate-200/50 text-slate-900'
        }`}>

          {isSuspended && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-rose-600 dark:text-rose-400 font-bold text-sm">Account Suspended</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-snug">
                  Your business account has been suspended by the platform administrator. Contact Whizpoint support for resolution.
                </p>
              </div>
            </div>
          )}

          {/* 1. ACTIVE SESSION STATE */}
          {activeSession ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Active Session Detected</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">You are already signed in on this device.</p>
              </div>

              {/* Active User Card */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                  {activeSession.name ? activeSession.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{activeSession.name || 'Whiz POS Operator'}</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate">{activeSession.email}</div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => activeSession?.isSuperAdmin ? navigate('/admin') : navigate(getReturnUrl(), { replace: true })}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className={`w-full h-12 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isDark 
                      ? 'border-white/10 hover:bg-white/5 text-rose-400' 
                      : 'border-slate-200 hover:bg-slate-50 text-rose-600'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Session</span>
                </button>
              </div>
            </div>
          ) : (
            
            /* 2. LOGIN / SIGNUP FORM */
            <div>
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isLogin ? 'Sign in to workspace' : 'Create your workspace'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 font-normal">
                  {isLogin 
                    ? 'Access your sales, multi-store inventory, and reports.' 
                    : 'Start your 14-day free trial. No credit card required.'
                  }
                </p>
              </div>

              {/* Segment Toggle Switcher */}
              <div className={`p-1 rounded-2xl border flex gap-1 mb-6 ${
                isDark ? 'bg-slate-950/80 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setFormData({ ...formData, businessName: '' }); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isLogin 
                      ? (isDark ? 'bg-cyan-500 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    !isLogin 
                      ? (isDark ? 'bg-cyan-500 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                
                {/* Business Name Field (Signup Only) */}
                {!isLogin && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100 ml-0.5">Business Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Apex Supermarket"
                        className={`w-full h-12 pl-10 pr-4 rounded-xl text-sm font-semibold border transition-all focus:outline-none ${
                          isDark 
                            ? 'bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                            : 'bg-slate-50 focus:bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/10'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 ml-0.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="operator@business.com"
                      className={`w-full h-12 pl-10 pr-4 rounded-xl text-sm font-semibold border transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                          : 'bg-slate-50 focus:bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/10'
                      }`}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-0.5">
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100">Password</label>
                    {isLogin && (
                      <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer">
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={isLogin ? '••••••••••••' : 'Min. 8 characters'}
                      className={`w-full h-12 pl-10 pr-11 rounded-xl text-sm font-semibold border transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20' 
                          : 'bg-slate-50 focus:bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isLogin ? 'Authenticating...' : 'Provisioning Workspace...'}</span>
                    </div>
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign In to Back Office' : 'Launch Free Workspace'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Social Google OAuth Button */}
                {isLogin && (
                  <div className="pt-2">
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                      <span className="flex-shrink mx-3 text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                        Or continue with
                      </span>
                      <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className={`w-full h-12 rounded-xl border font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                        isDark ? 'bg-slate-950/60 hover:bg-slate-800 border-white/10 text-white shadow-xs' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900 font-bold shadow-xs'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                )}

              </form>

              {/* Bottom Switcher */}
              <div className="mt-6 text-center text-xs text-slate-700 dark:text-slate-300">
                {isLogin ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className="font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer ml-1"
                    >
                      Start 14-day free trial &rarr;
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      className="font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer ml-1"
                    >
                      Sign in here &rarr;
                    </button>
                  </>
                )}
              </div>

            </div>
          )}

          {/* Legal micro-copy */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 text-center text-[11px] text-slate-600 dark:text-slate-400">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline font-semibold text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="underline font-semibold text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400">Privacy Policy</Link>.
          </div>

        </div>

      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 sm:p-8 border shadow-2xl animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-center mb-1">Confirm Sign Out</h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 text-center mb-6">
              Are you sure you want to log out of your Whiz POS account on this device?
            </p>
            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all cursor-pointer shadow-md shadow-rose-600/20"
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`w-full h-11 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                  isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
