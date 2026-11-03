import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { cn } from '../lib/utils';
import { Shield, ArrowRight, Delete, X, Fingerprint, Monitor } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../lib/soundUtils';
import authBgImage from '../assets/auth-bg.jpg';

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
          const roleUpper = String(result.user.role || '').toUpperCase();
          if (['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(roleUpper)) {
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
        const devRoleUpper = String(userToLogin.role || '').toUpperCase();
        if (['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(devRoleUpper)) {
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

      {/* Full Landscape Background Image (clear & vibrant across all screen sizes) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={authBgImage}
          onError={(e) => { (e.target as HTMLImageElement).src = '/auth-bg.jpg'; }}
          alt="Retail Checkout Background"
          className="w-full h-full object-cover object-center filter brightness-[0.98] contrast-[1.02]"
        />
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/20 to-slate-950/50 pointer-events-none" />
      </div>

      {/* Main Container */}
      <div className="z-10 w-full max-w-5xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left Side: Branding & PIN Display */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 animate-in fade-in slide-in-from-left-8 duration-700 bg-slate-900/70 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
          <div className="relative">
             <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-6 border border-white/20">
                <Shield className="w-10 h-10 text-white" />
             </div>
             <div className="absolute -top-2 -right-2 w-9 h-9 bg-white/15 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center">
                <Fingerprint className="w-4 h-4 text-cyan-300" />
             </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {businessSetup?.businessName?.toUpperCase() || 'WHIZPOINT SOLUTIONS'}
            </h1>
            <p className="text-cyan-200/90 text-base font-semibold tracking-wide">
              Your Daily Dose, Secured
            </p>
          </div>

          {/* PIN Display Dots */}
          <div className="flex gap-4 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-300 border-2",
                  pin.length > i
                    ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.9)]"
                    : "bg-white/10 border-white/40"
                )}
              />
            ))}
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={pin.length < 4 || isLoading}
            className="group relative px-8 py-3.5 bg-white text-slate-900 rounded-2xl font-black text-base hover:bg-cyan-50 transition-all shadow-2xl active:scale-95 disabled:opacity-50 flex items-center gap-3 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {isLoading ? 'VERIFYING...' : 'VERIFY ACCESS'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {error && (
            <div className="bg-red-500/25 border border-red-500/50 text-red-200 px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
              <X className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {/* Right Side: Larger, Translucent & Ultra-Modern Glass Keypad */}
        <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="bg-slate-900/40 backdrop-blur-3xl p-7 md:p-8 rounded-[2.5rem] border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] w-full max-w-[430px]">
            <div className="grid grid-cols-3 gap-3.5 md:gap-4">
              {[
                { num: '1', sub: '' },
                { num: '2', sub: 'ABC' },
                { num: '3', sub: 'DEF' },
                { num: '4', sub: 'GHI' },
                { num: '5', sub: 'JKL' },
                { num: '6', sub: 'MNO' },
                { num: '7', sub: 'PQRS' },
                { num: '8', sub: 'TUV' },
                { num: '9', sub: 'WXYZ' },
              ].map(({ num, sub }) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  disabled={isLoading}
                  className="relative group h-20 md:h-22 rounded-2xl md:rounded-3xl bg-white/[0.08] hover:bg-white/[0.18] active:bg-white/[0.28] transition-all duration-150 active:scale-95 border border-white/15 hover:border-white/35 flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.15)] cursor-pointer overflow-hidden backdrop-blur-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <span className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none group-hover:scale-105 transition-transform drop-shadow-sm">
                    {num}
                  </span>
                  {sub && (
                    <span className="text-[9px] font-bold text-cyan-200/60 tracking-[0.2em] mt-1 uppercase leading-none">
                      {sub}
                    </span>
                  )}
                </button>
              ))}

              {/* Clear Button */}
              <button
                onClick={() => handleKeyPress('clear')}
                disabled={isLoading}
                className="relative h-20 md:h-22 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center bg-rose-500/20 hover:bg-rose-500/35 text-rose-100 transition-all duration-150 border border-rose-500/30 hover:border-rose-500/50 active:scale-95 shadow-[0_4px_16px_rgba(244,63,94,0.15)] cursor-pointer backdrop-blur-md group"
                title="Clear"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-rose-400/10 to-transparent pointer-events-none rounded-2xl md:rounded-3xl" />
                <X className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-rose-200/70 tracking-widest uppercase mt-1 leading-none">
                  CLR
                </span>
              </button>

              {/* Zero Button */}
              <button
                onClick={() => handleKeyPress('0')}
                disabled={isLoading}
                className="relative group h-20 md:h-22 rounded-2xl md:rounded-3xl bg-white/[0.08] hover:bg-white/[0.18] active:bg-white/[0.28] transition-all duration-150 active:scale-95 border border-white/15 hover:border-white/35 flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.15)] cursor-pointer overflow-hidden backdrop-blur-md"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                <span className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none group-hover:scale-105 transition-transform drop-shadow-sm">
                  0
                </span>
                <span className="text-[9px] font-bold text-cyan-200/60 tracking-[0.2em] mt-1 uppercase leading-none">
                  +
                </span>
              </button>

              {/* Backspace Button */}
              <button
                onClick={() => handleKeyPress('delete')}
                disabled={isLoading}
                className="relative h-20 md:h-22 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-100 transition-all duration-150 border border-cyan-500/25 hover:border-cyan-500/45 active:scale-95 shadow-[0_4px_16px_rgba(6,182,212,0.15)] cursor-pointer backdrop-blur-md group"
                title="Backspace"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 to-transparent pointer-events-none rounded-2xl md:rounded-3xl" />
                <Delete className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-cyan-200/70 tracking-widest uppercase mt-1 leading-none">
                  DEL
                </span>
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

