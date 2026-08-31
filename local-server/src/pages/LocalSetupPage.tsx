import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Lock, Building2, Eye, EyeOff, ArrowRight, ArrowLeft,
  Database, Key, Printer,
  CreditCard, CheckCircle2, Cloud
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const isSignupInit = searchParams.get('signup') === 'true';
  const [isLogin, setIsLogin] = useState(!isSignupInit);
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  
  // Wizard State
  const [setupStep, setSetupStep] = useState(1);
  const totalSteps = 4;
  const [showSetupPw, setShowSetupPw] = useState(false);
  
  // Step 1: Cloud
  const [apiKey, setApiKey] = useState('');
  
  // Step 2: Business Profile
  const [businessName, setBusinessName] = useState('');
  const [businessInfo, setBusinessInfo] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  // Step 3: POS Configurations
  const [servedBy, setServedBy] = useState('Cashier');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your business!');
  const [printerType, setPrinterType] = useState('thermal');
  
  // Step 4: M-Pesa Setup
  const [mpesaPaybill, setMpesaPaybill] = useState('');
  const [mpesaTill, setMpesaTill] = useState('');
  const [mpesaAccount, setMpesaAccount] = useState('');
  
  // Step 5: Security
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const navigate = useNavigate();
  const [businessData, setBusinessData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('whiz-business');
    if (stored) {
      try { setBusinessData(JSON.parse(stored)); } catch(e) {}
    }
    const checkStatus = () => {
      fetch('/api/business/setup-status')
        .then(res => {
          if (!res.ok) throw new Error('Server not ready');
          return res.json();
        })
        .then(data => {
          setIsBackendReady(true);
          if (data.business) setBusinessData(data.business);
          if (data.isSetup) {
            const token = localStorage.getItem('whiz-token');
            if (token) {
              navigate('/dashboard', { replace: true });
            } else {
              setIsLogin(true);
            }
          } else {
            setIsLogin(false);
          }
        })
        .catch(_err => {
          console.log('Waiting for backend server to start...');
          setTimeout(checkStatus, 1500); // Retry every 1.5s until backend boots
        });
    };
    checkStatus();
  }, []);

  const handleNextStep = () => {
    if (setupStep < totalSteps) setSetupStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    if (setupStep > 1) setSetupStep(prev => prev - 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('whiz-token', data.token);
      const userData = data.user || data.business;
      localStorage.setItem('whiz-user', JSON.stringify(userData));
      if (data.business) localStorage.setItem('whiz-business', JSON.stringify(data.business));
      
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const body = { 
        email: username, 
        password, 
        businessName, 
        businessInfo, 
        address, 
        phone,
        apiKey,
        servedBy,
        receiptFooter,
        printerType,
        mpesaPaybill,
        mpesaTill,
        mpesaAccount
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      localStorage.setItem('whiz-token', data.token);
      const userData = data.user || data.business;
      localStorage.setItem('whiz-user', JSON.stringify(userData));
      if (data.business) localStorage.setItem('whiz-business', JSON.stringify(data.business));
      
      toast.success('Local Server Initialized Successfully');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
            {businessData?.name ? businessData.name : 'Whiz POS Local Server'}
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            {businessData?.name 
              ? 'Log in to manage your local operations, sync data, and configure your POS terminals.' 
              : 'Initialize your local server environment to securely bridge your cloud data with your physical store.'}
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
              {businessData?.name ? businessData.name : 'Whiz Local Server'}
            </h1>
            <p className="text-sm mt-2 text-center text-gray-500">
              {isLogin ? 'Secure access to your back office' : 'Initialize your local environment'}
            </p>
          </div>

        {/* Main Auth Card */}
        {!isBackendReady ? (
          <div className="glass-strong rounded-3xl p-12 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all text-center" style={{ border: '1px solid var(--border-glass)' }}>
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Starting Services...</h2>
            <p className="text-gray-500">Please wait while the local server initializes.</p>
          </div>
        ) : (
        <div className="glass-strong rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 relative overflow-hidden transition-all" style={{ border: '1px solid var(--border-glass)' }}>
          
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Mode switch */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)' }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
              style={{
                background: isLogin ? 'var(--bg-main)' : 'transparent',
                color: isLogin ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: isLogin ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
              style={{
                background: !isLogin ? 'var(--bg-main)' : 'transparent',
                color: !isLogin ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: !isLogin ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Server Setup
            </button>
          </div>

          {isLogin ? (
            /* ================= LOGIN MODE ================= */
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Admin Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-300"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}
                    placeholder="admin"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all duration-300"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw(!showLoginPw)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showLoginPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 px-4 mt-6 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #3b82f6 100%)' }}
              >
                {loading ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> : <>Access Back Office <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          ) : (
            /* ================= WIZARD MODE ================= */
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              
              {/* Progress Bar */}
              <div className="flex items-center gap-2 mb-6">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${setupStep >= i + 1 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                ))}
              </div>

              {/* Step 2: Business Profile */}
              {setupStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400"><Building2 className="w-5 h-5" /></div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Business Profile</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Business Name *</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="Acme Supermarket" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Phone *</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="+254..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Address *</label>
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="123 Main St" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Tagline / Info</label>
                    <input type="text" value={businessInfo} onChange={(e) => setBusinessInfo(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="Your friendly neighborhood store" />
                  </div>
                </div>
              )}

              {/* Step 3: POS Configurations */}
              {setupStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400"><Printer className="w-5 h-5" /></div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>POS & Printing</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Served By Label</label>
                    <input type="text" value={servedBy} onChange={(e) => setServedBy(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="e.g. Cashier, Server, Attendant" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Receipt Footer Message</label>
                    <textarea value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300 resize-none" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="Thank you for your business!" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Primary Printer Format</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPrinterType('thermal')} className={`py-3 rounded-xl border font-semibold transition-all ${printerType === 'thermal' ? 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Thermal Receipt (80mm)</button>
                      <button onClick={() => setPrinterType('a4')} className={`py-3 rounded-xl border font-semibold transition-all ${printerType === 'a4' ? 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Standard A4</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: M-Pesa Setup */}
              {setupStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400"><CreditCard className="w-5 h-5" /></div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>M-Pesa Payments</h3>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configure your STK Push or Till numbers. You can leave these blank if configuring later.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Paybill No.</label>
                      <input type="text" value={mpesaPaybill} onChange={(e) => setMpesaPaybill(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Till No.</label>
                      <input type="text" value={mpesaTill} onChange={(e) => setMpesaTill(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Account No. (For Paybill)</label>
                    <input type="text" value={mpesaAccount} onChange={(e) => setMpesaAccount(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} />
                  </div>
                </div>
              )}

              {/* Step 5: Security & Finish */}
              {setupStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400"><Lock className="w-5 h-5" /></div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Admin Security</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Admin Username *</label>
                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>4-Digit PIN / Password *</label>
                      <input type={showSetupPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} />
                    </div>
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Confirm *</label>
                      <input type={showSetupPw ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} />
                      <button type="button" onClick={() => setShowSetupPw(!showSetupPw)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors">
                        {showSetupPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Controls */}
              <div className="flex items-center justify-between pt-4 mt-8 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={setupStep === 1 || loading}
                  className="px-5 py-2.5 font-semibold rounded-lg flex items-center gap-2 transition-all disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--text-main)' }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                
                {setupStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={
                      (setupStep === 1 && (!businessName || !phone || !address))
                    }
                    className="px-6 py-2.5 font-bold rounded-lg flex items-center gap-2 transition-all shadow-md text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #3b82f6 100%)' }}
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSetup}
                    disabled={!username || !password || password !== confirmPassword || loading}
                    className="px-6 py-2.5 font-bold rounded-lg flex items-center gap-2 transition-all shadow-md text-white disabled:opacity-50 hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #3b82f6 100%)' }}
                  >
                    {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> : <>Initialize <CheckCircle2 className="w-4 h-4" /></>}
                  </button>
                )}
              </div>

            </div>
          )}

          {/* Secure Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            <Database className="w-4 h-4" />
            <span>SQLite Data stored securely on this device</span>
          </div>

        </div>
        )}
        </div>
      </div>
    </div>
  );
}
