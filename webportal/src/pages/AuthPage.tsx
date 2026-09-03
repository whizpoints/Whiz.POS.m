import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Building2, ArrowRight, Activity, Eye, EyeOff, Star } from 'lucide-react';

import { toast } from 'react-hot-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: ''
  });

  // Handle OAuth Redirect
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    if (token && userStr) {
      try {
        localStorage.setItem('whiz-token', token);
        localStorage.setItem('whiz-user', userStr);
        toast.success('Successfully logged in with Google!');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('whiz-token', data.token);
        localStorage.setItem('whiz-user', JSON.stringify(data.user));
        toast.success(isLogin ? 'Successfully logged in!' : 'Account created successfully!');
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

  return (
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-sky-500/30 selection:text-sky-900">
      
      {/* LEFT PANEL - ULTRA MODERN GRADIENT BRANDING */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12 lg:p-16">
        {/* Dynamic Multi-Color Background */}
        
        <div className="absolute inset-0 z-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0369a1 100%)' }}>
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, rgba(0,0,0,0) 70%)', animationDuration: '8s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full mix-blend-screen filter blur-[120px] opacity-60 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.9) 0%, rgba(0,0,0,0) 70%)', animationDuration: '12s', animationDelay: '2s' }} />
          <div className="absolute top-[30%] right-[20%] w-[50%] h-[50%] rounded-full mix-blend-screen filter blur-[90px] opacity-50 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.6) 0%, rgba(0,0,0,0) 70%)', animationDuration: '10s', animationDelay: '1s' }} />
        </div>
        
        {/* Decorative Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Content (Z-10 so it's above background) */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
               <img src="/logo.png" alt="Whiz POS" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Whiz<span className="text-sky-300">POS</span></h1>
          </div>
        </div>

        <div className="relative z-10 mt-auto mb-16">
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            The intelligent <br />
            retail operating <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-200">
              system.
            </span>
          </h2>
          <p className="text-lg text-blue-100/80 max-w-md font-medium leading-relaxed mb-10">
            Join thousands of modern businesses scaling their operations with enterprise-grade point of sale, inventory tracking, and beautiful invoicing.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-slate-200 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                </div>
              ))}
            </div>
            <div className="text-sm font-medium text-blue-100">
              <div className="flex items-center text-amber-400 gap-1 mb-0.5">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              Trusted by 500+ merchants
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - CLEAN FORM */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-y-auto">
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg">
             <img src="/logo.png" alt="Whiz POS" className="w-6 h-6 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Whiz<span className="text-sky-500">POS</span></h1>
        </div>

        <div className="w-full max-w-[420px] mx-auto pt-16 lg:pt-0">
          
          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-slate-500 font-medium text-base">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Start managing your retail empire today.'}
            </p>
          </div>

          {/* Ultra Modern Mode Switcher */}
          <div className="flex p-1 bg-slate-100/70 rounded-[1.25rem] mb-8 border border-slate-200/50 relative">
            <div 
              className="absolute inset-y-1 bg-white rounded-xl shadow-sm border border-slate-200/50 transition-all duration-300 ease-out" 
              style={{ 
                width: 'calc(50% - 4px)', 
                left: isLogin ? '4px' : 'calc(50%)' 
              }} 
            />
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-colors relative z-10 ${
                isLogin ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-colors relative z-10 ${
                !isLogin ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[13px] font-bold text-slate-700 ml-1">Business Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200/60 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-sky-50/30 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none text-[15px] font-medium"
                    placeholder="Acme Corporation"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700 ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200/60 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-sky-50/30 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none text-[15px] font-medium"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1 mr-1">
                <label className="text-[13px] font-bold text-slate-700">Password</label>
                {isLogin && (
                  <a href="#" className="text-[13px] font-bold text-sky-600 hover:text-sky-700 transition-colors">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-11 pr-12 py-3.5 bg-white border-2 border-slate-200/60 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-sky-50/30 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none text-[15px] font-medium tracking-wide"
                  placeholder="��������"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden bg-slate-900 hover:bg-slate-800 text-white font-bold text-[16px] py-4 px-4 rounded-2xl transition-all disabled:opacity-70 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98] flex items-center justify-center mt-6"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-100%] group-hover:translate-x-[100%] duration-1000" />
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <Activity className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In to Dashboard' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
            
            {isLogin && (
              <div className="relative mt-8 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-500 font-medium">Or continue with</span>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700 text-sm shadow-sm hover:shadow-md active:scale-[0.98]">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  Google
                </button>
                <button type="button" className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700 text-sm shadow-sm">
                  <img src="https://www.svgrepo.com/show/448234/microsoft.svg" className="w-5 h-5" alt="Microsoft" />
                  Microsoft
                </button>
              </div>
            )}
            
          </form>
          
          <div className="mt-12 text-center text-[13px] text-slate-500 font-medium">
            By proceeding, you agree to our <a href="#" className="font-bold text-slate-900 hover:text-sky-600 transition-colors">Terms of Service</a> and <a href="#" className="font-bold text-slate-900 hover:text-sky-600 transition-colors">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
