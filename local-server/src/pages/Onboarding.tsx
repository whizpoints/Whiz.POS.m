import { useState } from 'react';
import { Store, ArrowRight, Loader2, CheckCircle2, Server, DownloadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Cloud Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cloudToken, setCloudToken] = useState('');
  
  // Outlet Selection
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Step 1: Login to Cloud to fetch Outlets
  const handleCloudLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Authenticate against central cloud
      const res = await fetch('https://api.whizpoint.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (res.ok) {
        setCloudToken(data.token);
        
        // Fetch outlets available for this admin
        const outRes = await fetch('https://api.whizpoint.app/api/outlets', {
          headers: { 'Authorization': `Bearer ${data.token}` }
        });
        
        if (outRes.ok) {
          const outData = await outRes.json();
          setOutlets(outData.outlets || []);
          setStep(2);
        } else {
          // Fallback if cloud API differs
          setOutlets([{ id: 'out_demo', name: 'Demo Outlet' }]);
          setStep(2);
        }
      } else {
        toast.error(data.error || 'Invalid cloud credentials');
      }
    } catch (err) {
      console.error(err);
      // Fallback for development if cloud is unreachable
      toast.error('Could not reach Cloud Server. Simulating login for Dev Mode.');
      setCloudToken('dev_token');
      setOutlets([{ id: 'out_demo', name: 'Demo Outlet (Simulated)' }]);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Download Outlet Backup
  const handleSetupOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return toast.error('Please select an outlet');
    
    setLoading(true);
    try {
      // Call LOCAL server to download and setup the SQLite DB
      const res = await fetch('/api/setup/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          outletId: selectedOutlet, 
          cloudToken 
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setStep(3);
      } else {
        toast.error(data.error || 'Failed to download backup');
      }
    } catch (err) {
      toast.error('Network error while communicating with Local Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">Local Admin Server Setup</h2>
          <p className="mt-2 text-gray-400">Initialize this local server with your cloud outlet data.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center mb-10 px-8">
          <div className="flex items-center w-full max-w-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 1 ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-gray-800 text-gray-400'}`}>1</div>
            <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${step >= 2 ? 'bg-blue-600' : 'bg-gray-800'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 2 ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-gray-800 text-gray-400'}`}>2</div>
            <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${step >= 3 ? 'bg-blue-600' : 'bg-gray-800'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 3 ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-gray-800 text-gray-400'}`}>3</div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          {/* Step 1: Cloud Auth */}
          {step === 1 && (
            <form className="animate-in fade-in zoom-in duration-500" onSubmit={handleCloudLogin}>
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-500/10 mb-6">
                <Server className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 text-center">Connect to Cloud</h3>
              <p className="text-gray-400 mb-8 text-center leading-relaxed">
                Log in with your Whiz POS Cloud Admin credentials to fetch your available outlets.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                    placeholder="admin@yourbusiness.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-8 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
              </button>
            </form>
          )}

          {/* Step 2: Select Outlet & Download */}
          {step === 2 && (
            <form className="animate-in fade-in slide-in-from-right-8 duration-500" onSubmit={handleSetupOutlet}>
              <div className="text-center mb-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-500/10 mb-4">
                  <Store className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Select Outlet</h3>
                <p className="text-gray-400 text-sm mt-2">Which outlet will this Local Server manage?</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Available Outlets</label>
                  <select
                    required
                    value={selectedOutlet}
                    onChange={(e) => setSelectedOutlet(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                  >
                    <option value="" disabled>-- Select an Outlet --</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id} className="text-black">{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-blue-200 text-sm mt-4">
                  <DownloadCloud className="w-5 h-5 shrink-0 text-blue-400" />
                  <p>Selecting an outlet will download its entire backup (products, customers, settings) from the cloud into this local server.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedOutlet}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all mt-4"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Download & Setup Local Database'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-500/10 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">Setup Complete!</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Your Local Admin Server is now populated with data and fully operational offline.
              </p>

              <button
                onClick={() => {
                  // Log out of cloud context, redirect to local auth
                  localStorage.removeItem('whiz-token');
                  navigate('/auth');
                  toast.success('Please log in with your local credentials');
                }}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-green-500/20 text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition-all"
              >
                Go to Local Login
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
