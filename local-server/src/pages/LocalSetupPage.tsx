import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Lock, Building2, Eye, EyeOff, ArrowRight, ArrowLeft,
  Database, Key, Printer,
  CreditCard, CheckCircle2, Cloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import authBgImage from '../assets/auth-bg.jpg';

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
  
  // Step 1: Cloud & Branch Selection
  const [apiKey, setApiKey] = useState('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isApiKeyVerified, setIsApiKeyVerified] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [businessInfo, setBusinessInfo] = useState('');

  // Step 2: POS Configurations
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
          setTimeout(checkStatus, 300); // Retry every 1.5s until backend boots
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

  
  const handleVerifyApiKey = async () => { if (!apiKey) return toast.error('Please enter an API key'); setLoading(true); try { const CLOUD_API = 'https://backoffice.whizpoint.app'; const res = await fetch(`${CLOUD_API}/api/business/locations`, { headers: { 'x-api-key': apiKey } }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Invalid API Key'); const profileRes = await fetch(`${CLOUD_API}/api/business/profile`, { headers: { 'x-api-key': apiKey } }); const profileData = await profileRes.json(); if (profileRes.ok) { setBusinessName(profileData.business?.name || profileData.name || ''); setBusinessData(profileData.business || profileData); } setAvailableLocations(data.locations || []); if (data.locations && data.locations.length > 0) { setSelectedLocationId(data.locations[0].id); } setIsApiKeyVerified(true); toast.success('Successfully connected to cloud!'); } catch (err: any) { toast.error(err.message); } finally { setLoading(false); } }; // --- NEW: Modern Browser Authorization Flow ---
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  const handleLinkAccount = async () => {
    setLoading(true);
    try {
      const CLOUD_API = 'https://backoffice.whizpoint.app';
      
      const res = await fetch(`${CLOUD_API}/api/pairing/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SERVER', deviceInfo: { os: navigator.platform } })
      });
      if (!res.ok) throw new Error('Failed to generate link request');
      const data = await res.json();
      
      const connectUrl = `${CLOUD_API}/connect/server/${data.requestId}`;
      
      // Start polling
      const pId = setInterval(() => checkCloudApproval(CLOUD_API, data.requestId, pId), 3000);
      setPollIntervalId(pId);
      
      setIsApiKeyVerified(true); // Hijack the state to show waiting UI
      
      toast(`Please open the browser window that just popped up, or go to ${connectUrl}`, { duration: 10000 });
      window.open(connectUrl, '_blank');
    } catch (err: any) {
      toast.error('Cloud connection failed. Ensure you have internet.');
      setLoading(false);
    }
  };

  const checkCloudApproval = async (cloudApi: string, requestId: string, intervalId: any) => {
    try {
      const res = await fetch(`${cloudApi}/api/pairing/${requestId}/status`);
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.status === 'APPROVED' && data.credentials) {
        clearInterval(intervalId);
        
        // Trigger local DB seeding via /api/setup/sync
        const syncRes = await fetch('/api/setup/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outletId: data.credentials.outletId, cloudToken: data.credentials.apiKey })
        });

        if (syncRes.ok) {
           toast.success('Successfully Linked to Cloud and Synced!');
           setIsBackendReady(false); // force a reload of the layout
           setTimeout(() => window.location.reload(), 1500);
        } else {
           toast.error('Failed to save configuration locally');
           setIsApiKeyVerified(false);
        }
      } else if (data.status === 'EXPIRED') {
        clearInterval(intervalId);
        toast.error('Pairing request expired');
        setIsApiKeyVerified(false);
      }
    } catch (err) {
      // Keep polling
    }
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
      const locAddress = availableLocations.find(l => l.id === selectedLocationId)?.address || '';
      const body = { 
        email: username, 
        password, 
        businessName, 
        businessInfo, 
        address: locAddress, 
        phone,
        apiKey,
        cloudLocationId: selectedLocationId,
        cloudBusinessId: businessData?.id,
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
    <div data-theme="dark" className="min-h-screen relative flex flex-col md:flex-row bg-slate-950 overflow-hidden items-stretch select-none text-white">
      {/* Full Landscape Background Image (clear & vibrant) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={authBgImage}
          onError={(e) => { (e.target as HTMLImageElement).src = '/auth-bg.jpg'; }}
          alt="Retail Checkout Background"
          className="w-full h-full object-cover object-center filter brightness-[0.98] contrast-[1.02]"
        />
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/25 to-slate-950/55 pointer-events-none" />
      </div>

      {/* Split Screen - Left Side: Deep, informative, high-contrast branding panel */}
      <div className="hidden md:flex md:w-5/12 lg:w-5/12 p-8 lg:p-12 flex-col justify-between text-white relative z-10 overflow-hidden border-r border-white/15 bg-slate-950/75 backdrop-blur-xl">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Top Branding */}
        <div className="relative z-10 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
               <img src="/logo.png" alt="Whiz POS" className="w-8 h-8 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Local Server Node
              </span>
              <p className="text-xs text-slate-300 font-mono mt-0.5">Hybrid Offline-First Architecture</p>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-black mb-3 tracking-tight leading-tight !text-white drop-shadow-md" style={{ color: '#ffffff' }}>
            {businessData?.name ? businessData.name : 'Whiz POS Local Server'}
          </h1>
          <p className="text-slate-200 text-sm lg:text-base leading-relaxed mb-8" style={{ color: '#e2e8f0' }}>
            {businessData?.name 
              ? 'Log in to manage your local operations, sync data, and configure your POS terminals.' 
              : 'Dedicated local database and communication engine bridging your cloud data with your physical store registers.'}
          </p>

          {/* Substantial Feature List (Left panel not shallow) */}
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5 font-bold">
                ⚡
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Instant Checkout Execution</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Direct SQLite read/write eliminates internet lag for your point-of-sale registers.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 font-bold">
                🔄
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Autonomous LAN & Cloud Sync</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Seamless bi-directional sync pushes transactions to back office and refreshes stock.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5 font-bold">
                🛡️
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Zero Downtime Resilience</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Physical store operations and receipt printing continue running uninterrupted during internet outages.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="pt-6 border-t border-white/10 text-xs text-slate-400 flex items-center justify-between">
          <span>WhizPOS Core Server v2.4</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Production Ready
          </span>
        </div>
      </div>

      {/* Split Screen - Right Side: Modern High-Contrast Card */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-4 sm:p-8 sm:py-12 relative z-10">
        <div className="w-full max-w-[500px] relative z-10 transition-all duration-500">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex flex-col items-center justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm bg-slate-900/80 backdrop-blur-md border border-white/20">
               <img src="/logo.png" alt="Whiz POS" className="w-10 h-10 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center text-white">
              {businessData?.name ? businessData.name : 'Whiz Local Server'}
            </h1>
            <p className="text-sm mt-2 text-center text-slate-300">
              {isLogin ? 'Secure access to your back office' : 'Initialize your local environment'}
            </p>
          </div>

        {/* Main Auth Card */}
        {!isBackendReady ? (
          <div className="bg-slate-900/85 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all text-white animate-in fade-in duration-500">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                <div className="w-8 h-8 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-2xl font-black !text-white mb-2 tracking-tight" style={{ color: '#ffffff' }}>Starting Services...</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Initializing SQLite local database, multi-terminal bridge, and M-Pesa hardware listener.
            </p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-5 overflow-hidden border border-white/10">
              <div className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 h-full w-3/4 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <span>Connecting to local backend service on port 5050...</span>
            </div>
          </div>
        ) : (
        <div className="bg-slate-900/85 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/20 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 relative overflow-hidden transition-all text-white">
          
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>

          {/* Mode switch */}
          <div className="flex rounded-xl p-1 mb-8 bg-slate-800/80 border border-white/10">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer"
              style={{
                background: isLogin ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                color: isLogin ? '#ffffff' : '#94a3b8',
                boxShadow: isLogin ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer"
              style={{
                background: !isLogin ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                color: !isLogin ? '#ffffff' : '#94a3b8',
                boxShadow: !isLogin ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              Server Setup
            </button>
          </div>

          {isLogin ? (
            /* ================= LOGIN MODE ================= */
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider ml-1 text-slate-200">Admin Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-300 bg-slate-800/90 border border-white/20 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    placeholder="admin"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider ml-1 text-slate-200">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all duration-300 bg-slate-800/90 border border-white/20 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw(!showLoginPw)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showLoginPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 px-4 mt-6 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
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

              {/* Step 1: Cloud & Branch Selection */}
              {setupStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400"><Cloud className="w-5 h-5" /></div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Cloud Connection</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="offlineMode" checked={isOfflineMode} onChange={(e) => { setIsOfflineMode(e.target.checked); setApiKey(''); setSelectedLocationId(''); }} className="w-4 h-4 rounded text-blue-500 border-gray-300 focus:ring-blue-500" />
                    <label htmlFor="offlineMode" className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                      Local Offline Mode (Do not connect to Cloud)
                    </label>
                  </div>

                  {!isOfflineMode ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Business API Key *</label>
                        <div className="flex gap-2">
                          <input type="text" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setIsApiKeyVerified(false); }} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="whiz_..." />
                          <button type="button" onClick={handleVerifyApiKey} disabled={loading || !apiKey} className="px-4 py-3 rounded-xl bg-blue-500 text-white font-semibold disabled:opacity-50">Verify</button>
                        </div>
                      </div>
                      
                      {isApiKeyVerified && (
                        <div className="space-y-1.5 animate-in fade-in mt-4">
                          <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Select Branch (Location) *</label>
                          {availableLocations.length > 0 ? (
                            <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}>
                              {availableLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">No branches found. Please create a branch in the Back Office first.</div>
                          )}
                        </div>
                      )}

                      {isApiKeyVerified && (
                        <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-tertiary)' }}>
                          <div className="text-xs uppercase font-semibold text-gray-500 mb-2">Business Details (Auto-filled)</div>
                          <div className="font-medium">{businessName}</div>
                          {availableLocations.find(l => l.id === selectedLocationId)?.address && (
                            <div className="text-sm text-gray-500 mt-1">{availableLocations.find(l => l.id === selectedLocationId)?.address}</div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4 animate-in fade-in mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-tertiary)' }}>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Business Name *</label>
                        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="Enter Business Name" required />
                      </div>
                      <div className="space-y-1.5 mt-3">
                        <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Branch Location Name</label>
                        <input type="text" onChange={(e) => setBusinessInfo(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="e.g. Main Branch" />
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        You can always link to the Cloud Web Portal later from the Settings page.
                      </div>
                    </div>
                  )}
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
                      (setupStep === 1 && (!isOfflineMode && (!isApiKeyVerified || !selectedLocationId))) || (setupStep === 1 && isOfflineMode && !businessName)
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
