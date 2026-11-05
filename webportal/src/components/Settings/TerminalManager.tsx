import { useState, useEffect } from 'react';
import { CheckCircle2, Monitor, Clock, Server, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';
import { useBranchContext } from '../../context/BranchContext';
import { io } from 'socket.io-client';

export default function TerminalManager() {
  const { activeLocationId } = useBranchContext();
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirm();

  const fetchTerminals = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || window.location.origin}/api/terminals`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTerminals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch terminals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();

    let socket: any = null;
    try {
      const uStr = localStorage.getItem('whiz-user');
      const user = uStr ? JSON.parse(uStr) : null;
      const bizId = user?.businessId || user?.id;
      if (bizId) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        socket = io(API_BASE_URL);
        socket.emit('join_business', bizId);
        socket.on('terminal_status_changed', () => {
          fetchTerminals();
          window.dispatchEvent(new CustomEvent('whiz_outlet_changed'));
        });
      }
    } catch (e) {}

    // Polling fallback every 8 seconds
    const interval = setInterval(fetchTerminals, 8000);
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || window.location.origin}/api/terminals/${id}/approve`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('whiz-token') || ''}`,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({ locationId: activeLocationId === 'ALL' ? undefined : activeLocationId })
      });
      if (res.ok) {
        toast.success('Terminal approved and outlet created!');
        setTerminals(prev => prev.map(t => t.id === id ? { ...t, status: 'APPROVED' } : t));
        fetchTerminals();
        window.dispatchEvent(new CustomEvent('whiz_outlet_changed'));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to approve terminal');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Device?',
      message: 'Are you sure you want to delete this device? It will lose connection.',
      confirmText: 'Delete Device'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || window.location.origin}/api/terminals/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token') || ''}` },
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Device removed successfully!');
        setTerminals(prev => prev.filter(t => t.id !== id));
        fetchTerminals();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to delete device');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">Loading devices...</p>
      ) : terminals.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
          <Monitor className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400" />
          <p className="font-semibold text-slate-800 dark:text-slate-200">No POS Terminals or Server Nodes found.</p>
          <p className="text-xs text-slate-400 mt-1">Pair a local server or connect a POS client device to see it appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminals.map(term => {
            const isServer = term.deviceType === 'EDGE_SERVER' || (term.name && term.name.toLowerCase().includes('server'));
            return (
              <div key={term.id} className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${term.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {isServer ? <Server className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{term.name}</h4>
                        {isServer && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 uppercase tracking-wide border border-sky-100">
                            Edge Node
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{term.macAddress}</p>
                    </div>
                  </div>
                  {term.status === 'PENDING' ? (
                    <Clock className="w-5 h-5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>

                {term.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(term.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleDelete(term.id)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold py-2 rounded-xl transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active & Connected
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDelete(term.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                      title="Remove Device"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
