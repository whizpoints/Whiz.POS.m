import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

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
        
        // If they just registered, they might need verification
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
    <div className="min-h-screen relative flex flex-col md:flex-row bg-white">
      {/* Split Screen - Left Side */}
      <div className="hidden md:flex md:w-5/12 p-12 flex-col justify-center items-start text-white relative overflow-hidden" style={{ background: 'var(--accent-primary)' }}>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="relative z-10 w-full">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20">
             <img src="/logo.png" alt="Whiz POS" className="w-10 h-10 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight leading-tight">
            Whiz POS Cloud
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            Manage your entire retail business from the cloud. Access real-time analytics, inventory, and staff management from anywhere in the world.
          </p>
        </div>
      </div>

      {/* Split Screen - Right Side */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-4 sm:p-8 sm:py-12 bg-gray-50">
        <div className="w-full max-w-[500px] relative z-10 transition-all duration-500">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex flex-col items-center justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm bg-white border border-gray-100">
               <img src="/logo.png" alt="Whiz POS" className="w-10 h-10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center text-gray-900">
              Whiz POS Cloud
            </h1>
            <p className="text-sm mt-2 text-center text-gray-500">
              {isLogin ? 'Sign in to your account' : 'Start your 14-day free trial'}
            </p>
          </div>

          <div className="glass-strong rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 relative overflow-hidden transition-all" style={{ border: '1px solid var(--border-glass)' }}>
            
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="mb-8 text-center hidden md:block">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isLogin ? 'Don\'t have an account? ' : 'Already have an account? '}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-medium hover:underline transition-colors"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {isLogin ? 'Create one now' : 'Sign in instead'}
                </button>
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Business Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                      className="block w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-300"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Email address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-300"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full pl-11 pr-11 py-3 rounded-xl outline-none transition-all duration-300"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded cursor-pointer"
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium hover:underline transition-colors" style={{ color: 'var(--accent-primary)' }}>
                      Forgot password?
                    </a>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-blue-500/30"
                style={{ background: 'var(--accent-primary)' }}
              >
                {isLoading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create account')}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
