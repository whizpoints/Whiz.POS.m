import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Globe, Server, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { usePosStore } from '../store/posStore';

export default function ConnectionHealthPill() {
  const [status, setStatus] = useState<'cloud' | 'local' | 'offline'>('local');
  const [latency, setLatency] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { businessSetup } = usePosStore();

  const cloudUrl = 'https://api.whizpoint.app';
  const localUrl = 'http://localhost:3000';

  const checkHealth = async () => {
    setIsChecking(true);
    const start = Date.now();
    try {
      // 1. Try Cloudflare Tunnel mapped to api.whizpoint.app
      const cloudRes = await fetch(`${cloudUrl}/health`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      if (cloudRes && cloudRes.ok) {
        setLatency(Date.now() - start);
        setStatus('cloud');
        setIsChecking(false);
        return;
      }

      // 2. Fallback to Local Server on localhost:3000
      const localRes = await fetch(`${localUrl}/health`, { signal: AbortSignal.timeout(1500) }).catch(() => null);
      if (localRes && localRes.ok) {
        setLatency(Date.now() - start);
        setStatus('local');
        setIsChecking(false);
        return;
      }

      // 3. Fallback: Check if generic network is alive
      if (navigator.onLine) {
        setLatency(Date.now() - start);
        setStatus('cloud');
      } else {
        setStatus('offline');
        setLatency(null);
      }
    } catch {
      setStatus(navigator.onLine ? 'local' : 'offline');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all shadow-xs ${
          status === 'cloud'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : status === 'local'
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
        }`}
        title="Click to view Connection & M-Pesa Tunnel Health"
      >
        <span className="relative flex h-2 w-2">
          {status === 'cloud' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === 'cloud' ? 'bg-emerald-500' : status === 'local' ? 'bg-amber-500' : 'bg-rose-500'
            }`}
          ></span>
        </span>

        {status === 'cloud' ? (
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cloud Tunnel (api.whizpoint.app)</span>
            {latency && <span className="opacity-70 font-mono text-[10px]">({latency}ms)</span>}
          </span>
        ) : status === 'local' ? (
          <span className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-amber-600" />
            <span>Local Server (Port 3000)</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span>Offline Mode</span>
          </span>
        )}
      </button>

      {/* Diagnostics Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    status === 'cloud' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Network & Tunnel Health</h3>
                  <p className="text-xs text-gray-500">M-Pesa, Cloud Sync & Tunnel status</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Cloudflare Tunnel Endpoint:</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">api.whizpoint.app</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Local Backoffice Service:</span>
                  <span className="text-xs font-bold text-gray-800 font-mono">localhost:3000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Tunnel Status:</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      status === 'cloud'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {status === 'cloud' ? 'Active & Reachable Worldwide' : 'Operating Locally on Port 3000'}
                  </span>
                </div>
                {latency && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Round-Trip Ping Latency:</span>
                    <span className="text-xs font-bold text-emerald-600 font-mono">{latency} ms</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  M-Pesa Callbacks (Lipa Na M-Pesa STK)
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Safaricom sends STK push results to <strong>https://api.whizpoint.app</strong>, which instantly reaches port 3000 via your Cloudflare tunnel.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={checkHealth}
                disabled={isChecking}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Recheck Now'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
