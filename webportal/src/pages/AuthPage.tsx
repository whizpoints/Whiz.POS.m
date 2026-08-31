import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, Eye, EyeOff, ArrowRight, ShieldCheck, CloudLightning, Activity, BarChart3, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: ''
  });

  const features = [
    { icon: <CloudLightning className="w-6 h-6 text-sky-500" />, title: "Instant Edge Sync", desc: "Data synchronizes globally in milliseconds." },
    { icon: <BarChart3 className="w-6 h-6 text-indigo-500" />, title: "Enterprise Analytics", desc: "Live insights and forecasting for all branches." },
    { icon: <Globe className="w-6 h-6 text-blue-500" />, title: "Centralized Management", desc: "Control every till and outlet from one dashboard." }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : (import.meta.env.VITE_API_BASE_URL || '');
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('whiz-token', data.token);
        localStorage.setItem('whiz-user', JSON.stringify(data.user));
        toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
        
        if (!isLogin) {
          navigate('/verify-email');
        } else {
          if (data.business && data.business.emailVerified === false) {
             navigate('/verify-email');
          } else {
             if (data.user?.role === 'Cashier' || data.user?.role === 'CASHIER') {
               navigate('/dashboard/sales');
             } else {
               navigate('/dashboard');
             }
          }
        }
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-end sm:justify-center p-0 sm:p-8 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-white to-blue-50">
      
      {/* Soft, Light Background Meshes */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-sky-200/50 rounded-full blur-[100px] mix-blend-multiply pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-indigo-200/50 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay pointer-events-none"></div>

      {/* Main Glass "Combo" Card */}
      <div className="w-full h-full sm:h-auto sm:max-h-none max-h-[90vh] max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/80 sm:bg-white/70 backdrop-blur-3xl sm:border border-white shadow-[0_-8px_40px_rgba(0,0,0,0.04)] sm:shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-t-[3rem] sm:rounded-[2.5rem] relative z-10 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* LEFT PANEL - Marketing (Light Theme) */}
        <div className="hidden lg:flex flex-col justify-between p-12 relative bg-gradient-to-br from-sky-500/5 to-blue-600/5 border-r border-white/50">
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-sky-100">
               <img src="/logo.png" alt="Whiz POS" className="w-7 h-7" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">Whiz<span className="text-sky-500">Cloud</span></span>
          </div>

          <div className="relative z-10 max-w-md mt-12">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight drop-shadow-sm">
              The intelligent <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">
                operating system
              </span><br/>
              for modern retail.
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed mb-10 font-medium">
              Seamlessly bridge your physical outlets with powerful cloud analytics. Manage inventory, staff, and multi-branch operations in real-time.
            </p>

            {/* Interactive Feature Carousel */}
            <div className="space-y-4">
              {features.map((feat, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-3xl border transition-all duration-500 flex items-start gap-4 ${
                    activeFeature === idx 
                    ? 'bg-white border-white shadow-lg scale-100 opacity-100' 
                    : 'bg-white/40 border-transparent scale-95 opacity-60 hover:opacity-100 hover:bg-white/60 cursor-default'
                  }`}
                >
                  <div className="p-3 bg-slate-50 rounded-2xl shadow-sm border border-slate-100">
                    {feat.icon}
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold mb-0.5">{feat.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-medium">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-slate-500 text-sm font-semibold mt-12">
            <ShieldCheck className="w-5 h-5 text-sky-500" />
            Bank-grade 256-bit AES encryption
          </div>
        </div>

        {/* RIGHT PANEL - Authentication Form */}
        <div className="w-full flex flex-col justify-start sm:justify-center px-6 py-10 sm:p-12 relative bg-white/50 sm:bg-white/40">
          
          {/* Mobile Drag Indicator */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 sm:hidden"></div>

          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-sky-500/10 border border-sky-100/50 mb-5">
               <img src="/logo.png" alt="Whiz POS" className="w-12 h-12" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Whiz<span className="text-sky-500">Cloud</span></h1>
          </div>

          <div className="w-full max-w-[420px] mx-auto">
            
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-slate-500 font-medium text-base">
                {isLogin ? 'Enter your details to access your dashboard.' : 'Start managing your retail empire today.'}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1.5 bg-slate-100/80 rounded-full mb-10 border border-slate-200/50 shadow-inner">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3.5 text-[15px] font-bold rounded-full transition-all duration-300 ${
                  isLogin 
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3.5 text-[15px] font-bold rounded-full transition-all duration-300 ${
                  !isLogin 
                  ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-bold text-slate-700 ml-2">Business Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                      className="block w-full pl-14 pr-5 py-4 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-3xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 transition-all outline-none shadow-sm text-base font-medium"
                      placeholder="Acme Corporation"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-2">Work Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Mail className="h-6 w-6" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full pl-14 pr-5 py-4 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-3xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 transition-all outline-none shadow-sm text-base font-medium"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2 mr-2">
                  <label className="text-sm font-bold text-slate-700">Password</label>
                  {isLogin && (
                    <a href="#" className="text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Lock className="h-6 w-6" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full pl-14 pr-14 py-4 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-3xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 transition-all outline-none shadow-sm text-base font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[17px] py-4.5 px-4 rounded-3xl transition-all disabled:opacity-70 shadow-[0_12px_24px_rgba(14,165,233,0.35)] hover:shadow-[0_16px_32px_rgba(14,165,233,0.45)] active:scale-[0.98] flex items-center justify-center mt-8 h-14"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-100%] group-hover:translate-x-[100%] duration-1000" />
                <span className="relative flex items-center gap-2">
                  {isLoading ? (
                    <Activity className="w-6 h-6 animate-pulse" />
                  ) : (
                    <>
                      {isLogin ? 'Sign In to Dashboard' : 'Create Account'}
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>
            
            <div className="mt-10 pt-8 border-t border-slate-200/50 text-center text-[13px] text-slate-500 font-medium">
              By proceeding, you agree to our <a href="#" className="font-bold text-slate-700 hover:text-sky-600 transition-colors">Terms of Service</a> and <a href="#" className="font-bold text-slate-700 hover:text-sky-600 transition-colors">Privacy Policy</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
