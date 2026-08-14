import { useState, useEffect } from 'react';
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('whiz-token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.whizpoint.app';

  // Automatically check verification status periodically
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    const checkStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.emailVerified) {
            clearInterval(interval);
            toast.success('Email verified successfully!');
            try {
              const userStr = localStorage.getItem('whiz-user');
              const user = userStr ? JSON.parse(userStr) : null;
              if (user && (user.role === 'Cashier' || user.role === 'CASHIER')) {
                navigate('/dashboard/sales');
              } else {
                navigate('/dashboard');
              }
            } catch(e) {
              navigate('/dashboard');
            }
          }
        }
      } catch (e) {
        console.error('Error checking verification status', e);
      } finally {
        setChecking(false);
      }
    };

    // Check immediately, then every 5 seconds
    checkStatus();
    interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [token, navigate, API_BASE_URL]);

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Verification email sent! Check your inbox.');
      } else {
        toast.error(data.error || 'Failed to resend email');
      }
    } catch (e) {
      toast.error('Network error while resending email');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('whiz-token');
    localStorage.removeItem('whiz-user');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gray-50 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-gray-100 text-center animate-in fade-in zoom-in duration-500">
        
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <Mail className="w-10 h-10 text-blue-600 absolute animate-pulse" />
          {checking && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin opacity-50" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          We've sent a verification link to your email address. Please click the link to verify your account and access your dashboard.
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 text-left flex-1">
              Waiting for you to click the link... This page will update automatically.
            </p>
          </div>

          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Resend Verification Email
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log out and try another account
          </button>
        </div>
      </div>
    </div>
  );
}
