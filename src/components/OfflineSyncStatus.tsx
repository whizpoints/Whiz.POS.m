import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePosStore } from '../store/posStore';
import { 
  Wifi, WifiOff, CheckCircle2, AlertTriangle, RefreshCw, 
  Database, Clock, ArrowUpCircle, ArrowDownCircle, Server, 
  Smartphone, Zap, Shield, Globe, Activity, X, Trash2
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import toast from 'react-hot-toast';

interface SyncError {
  id: string;
  message: string;
  timestamp: string;
  type: 'push' | 'pull' | 'connection';
}

interface ServerHealth {
  status: 'checking' | 'online' | 'offline' | 'degraded';
  latencyMs: number | null;
  lastChecked: string | null;
}

export default function OfflineSyncStatus() {
  const { 
    syncQueue, isOnline, processSyncQueue, syncFromServer, 
    pushDataToServer, lastSyncTime, syncStatus, businessSetup 
  } = usePosStore();

  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [showFullSyncConfirm, setShowFullSyncConfirm] = useState(false);
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [serverHealth, setServerHealth] = useState<ServerHealth>({
    status: 'checking', latencyMs: null, lastChecked: null
  });
  const [syncHistory, setSyncHistory] = useState<Array<{
    id: string; action: string; status: 'success' | 'failed'; timestamp: string; detail?: string;
  }>>([]);

  const errorAutoCleanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-clear errors older than 30 seconds
  useEffect(() => {
    errorAutoCleanRef.current = setInterval(() => {
      setErrors(prev => {
        const cutoff = Date.now() - 30000;
        return prev.filter(e => new Date(e.timestamp).getTime() > cutoff);
      });
    }, 5000);
    return () => { if (errorAutoCleanRef.current) clearInterval(errorAutoCleanRef.current); };
  }, []);

  // Server health check - pings the backend every 8 seconds
  const checkServerHealth = useCallback(async () => {
    const rawUrl = businessSetup?.backOfficeUrl || businessSetup?.apiUrl;
    if (!rawUrl) {
      setServerHealth({ status: 'offline', latencyMs: null, lastChecked: new Date().toISOString() });
      return;
    }
    let apiUrl = rawUrl.replace(/\/$/, '').replace(/\/api$/, '');

    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/api/health`, { 
        method: 'GET', 
        signal: AbortSignal.timeout(5000) 
      });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        setServerHealth({ status: latency > 2000 ? 'degraded' : 'online', latencyMs: latency, lastChecked: new Date().toISOString() });
      } else {
        setServerHealth({ status: 'degraded', latencyMs: latency, lastChecked: new Date().toISOString() });
      }
    } catch {
      setServerHealth({ status: 'offline', latencyMs: null, lastChecked: new Date().toISOString() });
    }
  }, [businessSetup]);

  useEffect(() => {
    checkServerHealth();
    healthCheckRef.current = setInterval(checkServerHealth, 8000);
    return () => { if (healthCheckRef.current) clearInterval(healthCheckRef.current); };
  }, [checkServerHealth]);

  // Watch syncStatus for errors and log history
  useEffect(() => {
    if (syncStatus?.error) {
      setErrors(prev => [
        { id: `err-${Date.now()}`, message: syncStatus.error!, timestamp: new Date().toISOString(), type: 'push' },
        ...prev.slice(0, 19)
      ]);
    }
    if (syncStatus?.progress === 100 && syncStatus?.currentTask) {
      setSyncHistory(prev => [
        { id: `h-${Date.now()}`, action: syncStatus.currentTask, status: 'success', timestamp: new Date().toISOString() },
        ...prev.slice(0, 29)
      ]);
    }
  }, [syncStatus?.error, syncStatus?.progress, syncStatus?.currentTask]);

  const addError = (message: string, type: SyncError['type']) => {
    setErrors(prev => [
      { id: `err-${Date.now()}`, message, timestamp: new Date().toISOString(), type },
      ...prev.slice(0, 19)
    ]);
  };

  const addHistoryEntry = (action: string, status: 'success' | 'failed', detail?: string) => {
    setSyncHistory(prev => [
      { id: `h-${Date.now()}`, action, status, timestamp: new Date().toISOString(), detail },
      ...prev.slice(0, 29)
    ]);
  };

  const handlePushSync = async () => {
    if (!isOnline) { toast.error("You are offline."); return; }
    setIsPushing(true);
    try {
      await pushDataToServer();
      addHistoryEntry('Push to Server', 'success', `${syncQueue.length} items`);
      toast.success('Push sync completed.');
    } catch (error: any) {
      addError(error.message || 'Push sync failed', 'push');
      addHistoryEntry('Push to Server', 'failed', error.message);
      toast.error('Push sync failed.');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullSync = async () => {
    if (!isOnline) { toast.error("You are offline."); return; }
    setIsPulling(true);
    try {
      await syncFromServer();
      addHistoryEntry('Pull from Server', 'success');
      toast.success('Pull sync completed.');
    } catch (error: any) {
      addError(error.message || 'Pull sync failed', 'pull');
      addHistoryEntry('Pull from Server', 'failed', error.message);
      toast.error('Pull sync failed.');
    } finally {
      setIsPulling(false);
    }
  };

  const executeFullSync = async () => {
    setIsFullSyncing(true);
    try {
      await pushDataToServer();
      addHistoryEntry('Full Cloud Sync', 'success');
      toast.success('Full sync completed.');
    } catch (error: any) {
      addError(error.message || 'Full sync failed', 'push');
      addHistoryEntry('Full Cloud Sync', 'failed', error.message);
      toast.error('Full sync failed.');
    } finally {
      setIsFullSyncing(false);
    }
  };

  const handleFullSyncClick = () => {
    if (!isOnline) { toast.error("You are offline."); return; }
    setShowFullSyncConfirm(true);
  };

  const dismissError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const clearAllErrors = () => setErrors([]);

  // Derived values
  const backOfficeUrl = businessSetup?.backOfficeUrl || businessSetup?.apiUrl || 'Not configured';
  const timeSinceSync = lastSyncTime 
    ? Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 1000) 
    : null;
  
  const formatTimeSince = (seconds: number | null) => {
    if (seconds === null) return 'Never';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Re-render timer for "time since sync"
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const healthColor = serverHealth.status === 'online' ? 'emerald' 
    : serverHealth.status === 'degraded' ? 'amber' 
    : serverHealth.status === 'checking' ? 'slate' : 'red';

  const isBusy = isPushing || isPulling || isFullSyncing || syncStatus?.isSyncing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sync Center</h1>
              <p className="text-sm text-slate-500">Real-time synchronization & server health</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-500 ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' 
              : 'bg-red-50 text-red-700 ring-1 ring-red-200 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* ─── Connection & Server Health ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Server Status Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-transparent -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full bg-${healthColor}-500 ${serverHealth.status === 'checking' ? 'animate-pulse' : ''}`} 
                  style={{
                    backgroundColor: healthColor === 'emerald' ? '#10b981' 
                      : healthColor === 'amber' ? '#f59e0b' 
                      : healthColor === 'red' ? '#ef4444' : '#94a3b8'
                  }} />
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Server Status</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 capitalize">{serverHealth.status}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="truncate">{backOfficeUrl}</span>
                </p>
                {serverHealth.latencyMs !== null && (
                  <p className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Latency: <strong>{serverHealth.latencyMs}ms</strong></span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Last Sync Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-50 to-transparent -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Last Sync</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatTimeSince(timeSinceSync)}</p>
              <p className="mt-3 text-xs text-slate-500">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'No sync recorded yet'}
              </p>
            </div>
          </div>

          {/* Queue Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-amber-50 to-transparent -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pending Queue</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{syncQueue.length} <span className="text-sm font-normal text-slate-500">items</span></p>
              <p className="mt-3 text-xs text-slate-500">Auto-sync interval: 10 seconds</p>
            </div>
          </div>
        </div>

        {/* ─── Live Sync Progress ─── */}
        {isBusy && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-200/60 p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-semibold text-slate-800">
                {syncStatus?.currentTask || 'Syncing...'}
              </span>
              <span className="ml-auto text-sm font-bold text-blue-600">{syncStatus?.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${syncStatus?.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ─── Actions & Errors ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Manual Sync Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-600" /> Manual Sync Controls
            </h2>
            <div className="space-y-3">
              <button
                onClick={handlePushSync}
                disabled={isPushing || !isOnline}
                className="w-full group flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <ArrowUpCircle className={`w-5 h-5 ${isPushing ? 'animate-bounce' : 'group-hover:-translate-y-0.5 transition-transform'}`} />
                <span>{isPushing ? 'Pushing Data...' : 'Push to Server'}</span>
                <span className="ml-auto text-blue-200 text-xs">Desktop → Cloud</span>
              </button>

              <button
                onClick={handlePullSync}
                disabled={isPulling || !isOnline}
                className="w-full group flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <ArrowDownCircle className={`w-5 h-5 ${isPulling ? 'animate-bounce' : 'group-hover:translate-y-0.5 transition-transform'}`} />
                <span>{isPulling ? 'Pulling Updates...' : 'Pull from Server'}</span>
                <span className="ml-auto text-emerald-200 text-xs">Cloud → Desktop</span>
              </button>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleFullSyncClick}
                  disabled={isFullSyncing || !isOnline}
                  className="w-full group flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  <Database className={`w-5 h-5 ${isFullSyncing ? 'animate-pulse' : ''}`} />
                  <span>{isFullSyncing ? 'Full Sync Running...' : 'Full Cloud Synchronization'}</span>
                </button>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  Force pushes all local data to the Back Office. Use with caution.
                </p>
              </div>
            </div>
          </div>

          {/* Errors Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Errors
                {errors.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{errors.length}</span>
                )}
              </h2>
              {errors.length > 0 && (
                <button onClick={clearAllErrors} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {errors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                  <CheckCircle2 className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No errors</p>
                  <p className="text-xs text-slate-300 mt-1">Errors auto-clear after 30 seconds</p>
                </div>
              ) : (
                errors.map((err) => (
                  <div 
                    key={err.id} 
                    className="group flex items-start gap-3 p-3 rounded-xl bg-red-50/70 border border-red-100 animate-in slide-in-from-right-4"
                  >
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-800 font-medium truncate">{err.message}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">
                        {err.type.toUpperCase()} · {new Date(err.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => dismissError(err.id)} 
                      className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ─── Sync History ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" /> Recent Activity
            </h2>
            <span className="text-xs text-slate-400">{syncHistory.length} entries</span>
          </div>
          {syncHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <RefreshCw className="w-12 h-12 mb-3" />
              <p className="text-sm text-slate-400">No sync activity yet</p>
              <p className="text-xs text-slate-300 mt-1">Activity will appear here as syncs run</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {syncHistory.map((entry) => (
                <div key={entry.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    entry.status === 'success' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-red-50 text-red-500'
                  }`}>
                    {entry.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{entry.action}</p>
                    {entry.detail && <p className="text-xs text-slate-400 truncate">{entry.detail}</p>}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Offline Mode Banner ─── */}
        {!isOnline && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <WifiOff className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-900">Offline Mode Active</h3>
                <p className="text-sm text-amber-700 mt-1">
                  All transactions are being saved locally. Sync will resume automatically when connectivity is restored.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-600">
                  <span>• {syncQueue.length} items queued</span>
                  <span>• Data secured on device</span>
                  <span>• All POS features available</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showFullSyncConfirm}
        onCancel={() => setShowFullSyncConfirm(false)}
        onConfirm={executeFullSync}
        title="Full Synchronization"
        description="This will force push all your Desktop data to the Back Office, potentially overwriting data there. Are you sure you want to continue?"
        confirmLabel="Start Full Sync"
        variant="warning"
      />
    </div>
  );
}
