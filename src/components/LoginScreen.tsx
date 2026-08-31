import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { cn } from '../lib/utils';
import { Shield, ArrowRight, Delete, X, Fingerprint, Monitor } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../lib/soundUtils';

const LoginScreen = () => {
  const { users, setSession, businessSetup } = usePosStore();
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable full-screen mode:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };


  const handleKeyPress = (key: string) => {
    if (isLoading) return;

    if (key === 'clear') {
      soundManager.playPop();
      setPin('');
      setError('');
    } else if (key === 'delete') {
      soundManager.playPop();
      setPin(prev => prev.slice(0, -1));
      setError('');
    } else if (key === 'enter') {
      handleLogin();
    } else {
      if (pin.length < 4) {
        soundManager.playClick();
        const newPin = pin + key;
        setPin(newPin);
        if (newPin.length === 4) {
          handleLogin(newPin);
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeyPress('delete');
      } else if (e.key === 'Enter') {
        handleKeyPress('enter');
      } else if (e.key === 'Escape') {
        handleKeyPress('clear');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLoading]);

  const handleLogin = async (explicitPin?: string) => {
    const loginPin = explicitPin || pin;
    if (isLoading) return;

    if (loginPin.length < 4) {
      setError('Enter 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Find user by PIN (check both pin and password fields due to backend schema)
      const userToLogin = users.find(u => 
        (u.pin === loginPin || u.password === loginPin) && u.isActive !== false
      );

      if (!userToLogin) {
        soundManager.playError();
        setError('Invalid PIN or account disabled');
        setPin('');
        setIsLoading(false);
        return;
      }

      if (window.electron && window.electron.auth) {
        const result = await window.electron.auth.login(userToLogin.id, loginPin, 'desktop-main');
        if (result.success && result.token && result.user) {
          soundManager.playSuccess();
          toast("Login Successful", "success");
          setSession(result.user, result.token);
          if (result.user.role === 'ADMIN' || result.user.role === 'MANAGER') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          soundManager.playError();
          setError(result.error || 'Login failed');
          setPin('');
        }
      } else {
        // Fallback for dev/web environment
        soundManager.playSuccess();
        toast("Login Successful (Dev Mode)", "success");
        setSession(userToLogin, 'dev-token');
        if (userToLogin.role === 'ADMIN' || userToLogin.role === 'MANAGER') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (e) {
      setError('System Error during Login');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans select-none">

            {/* Background Mesh Gradient */}
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] from-cyan-900 via-slate-950 to-slate-950" />
        <div className="absolute bottom-0 left-[-20%] w-[800px] h-[800px] bg-blue-900/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-800/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
      </div>

      {/* Main Container */}
      <div className="z-10 w-full max-w-5xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left Side: Branding & PIN Display */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="relative">
             <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-6 border border-white/20">
                <Shield className="w-12 h-12 text-white" />
             </div>
             <div className="absolute -top-2 -right-2 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-cyan-300" />
             </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
              {businessSetup?.businessName?.toUpperCase() || 'WHIZ POS'}
            </h1>
            <p className="text-cyan-100/70 text-lg font-medium tracking-wide">
              Your Daily Dose, Secured
            </p>
          </div>

          {/* PIN Display Dots */}
          <div className="flex gap-5 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-300 border-2",
                  pin.length > i
                    ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                    : "bg-transparent border-white/30"
                )}
              />
            ))}
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={pin.length < 4 || isLoading}
            className="group relative px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-cyan-50 transition-all shadow-2xl active:scale-95 disabled:opacity-50 flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {isLoading ? 'VERIFYING...' : 'VERIFY ACCESS'}
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 animate-bounce">
              <X className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {/* Right Side: Glass Keypad */}
        <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl w-full max-w-[400px]">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num.toString())}
                  disabled={isLoading}
                  className="aspect-square rounded-2xl text-3xl font-bold text-white bg-white/5 hover:bg-white/20 transition-all active:scale-90 border border-white/10 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleKeyPress('clear')}
                disabled={isLoading}
                className="aspect-square rounded-2xl flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-200 transition-all border border-red-500/30 active:scale-90"
              >
                <X className="w-8 h-8" />
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                disabled={isLoading}
                className="aspect-square rounded-2xl text-3xl font-bold text-white bg-white/5 hover:bg-white/20 transition-all active:scale-90 border border-white/10 flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={() => handleKeyPress('delete')}
                disabled={isLoading}
                className="aspect-square rounded-2xl flex items-center justify-center bg-slate-500/20 hover:bg-slate-500/40 text-white transition-all border border-white/10 active:scale-90"
              >
                <Delete className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling Footer */}
      <div className="fixed bottom-0 left-0 w-full bg-black/60 backdrop-blur-md border-t border-white/10 py-3 overflow-hidden z-20">
        <div className="flex whitespace-nowrap animate-marquee-fast">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="text-xs font-bold text-white/80 uppercase tracking-widest mx-12 flex items-center gap-4">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              SYSTEM DEVELOPED AND MAINTAINED BY <span className="text-cyan-400">WHIZPOINT SOLUTIONS</span>
              <span className="text-white/40">|</span>
              TELL/WHATSAPP <span className="text-cyan-400">0740 841 168</span> TO GET STARTED
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-fast {
          animation: marquee 30s linear infinite;
        }
      `}</style>
      {/* Floating Developer Access Button */}
      <button
        onClick={() => navigate('/developer')}
        className="fixed bottom-12 left-6 z-50 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white/50 hover:text-white transition-all shadow-lg"
        title="Developer Mode"
      >
        <Shield className="w-5 h-5" />
      </button>
      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullScreen}
        className="fixed bottom-12 right-6 z-50 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white/50 hover:text-white transition-all shadow-lg"
        title="Toggle Fullscreen"
      >
        <Monitor className="w-5 h-5" />
      </button>

    </div>
  );
};

export default LoginScreen;

