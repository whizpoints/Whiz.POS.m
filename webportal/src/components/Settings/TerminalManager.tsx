import { useState, useEffect } from 'react';
import { CheckCircle2, Monitor, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TerminalManager() {
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTerminals = async () => {
    try {
      const res = await fetch('/api/terminals');
      if (res.ok) {
        const data = await res.json();
        setTerminals(data);
      }
    } catch (err) {
      console.error('Failed to fetch terminals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();
    // Poll for new terminals every 5 seconds
    const interval = setInterval(fetchTerminals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/terminals/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        toast.success('Terminal approved successfully!');
        fetchTerminals();
      } else {
        toast.error('Failed to approve terminal');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this terminal?')) return;
    try {
      const res = await fetch(`/api/terminals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Terminal deleted successfully!');
        fetchTerminals();
      } else {
        toast.error('Failed to delete terminal');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-gray-400">Loading terminals...</p>
      ) : terminals.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
          <Monitor className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No POS Terminals found on the network.</p>
          <p className="text-sm mt-1">Open Whiz POS on a client device to broadcast a connection request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminals.map(term => (
            <div key={term.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${term.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{term.name}</h4>
                    <p className="text-xs text-gray-400 font-mono">{term.macAddress}</p>
                  </div>
                </div>
                {term.status === 'PENDING' ? (
                  <Clock className="w-5 h-5 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
              </div>

              {term.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(term.id)}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleDelete(term.id)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Reject / Delete
                  </button>
                </div>
              ) : (
                <div className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">API Key assigned</p>
                    <code className="text-xs font-mono text-green-400">{term.apiKey}</code>
                  </div>
                  <button 
                    onClick={() => handleDelete(term.id)}
                    className="text-red-500 hover:bg-red-500/20 p-2 rounded-lg transition-colors"
                    title="Delete Terminal"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
