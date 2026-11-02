import { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Download, RefreshCw, HardDrive, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../../lib/utils';

export default function AdminSecurity() {
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch(`${getApiBaseUrl()}/api/backup/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e: any) {
      console.error('Failed to load backups:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch(`${getApiBaseUrl()}/api/backup/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ passphrase })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Encrypted backup created: ${data.fileName}`);
        fetchBackups();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create backup');
      }
    } catch (e: any) {
      toast.error('Network error creating backup');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            Security & Encrypted Backups
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Military-grade AES-256-GCM automated snapshots and tamper-proof archival for POS terminals & servers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Custom passphrase (optional)"
            className="bg-black/40 border border-white/10 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 w-48"
          />
          <button
            onClick={handleCreateBackup}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Generate Encrypted Backup</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0e1713]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <Lock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Encryption Protocol</span>
          </div>
          <div className="text-2xl font-black text-white">AES-256-GCM</div>
          <p className="text-xs text-slate-400 mt-2">
            Authenticated 256-bit encryption with PBKDF2 (100,000 iterations) and 16-byte random salt.
          </p>
        </div>

        <div className="bg-[#0e1713]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Automated Cadence</span>
          </div>
          <div className="text-2xl font-black text-white">Every 15 Mins</div>
          <p className="text-xs text-slate-400 mt-2">
            High-frequency background daemon captures WAL and configuration deltas continuously.
          </p>
        </div>

        <div className="bg-[#0e1713]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-purple-400 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Tamper Protection</span>
          </div>
          <div className="text-2xl font-black text-white">Cryptographic Tag</div>
          <p className="text-xs text-slate-400 mt-2">
            16-byte GCM Auth Tag. If a single bit is modified in an external editor, restore halts immediately.
          </p>
        </div>

        <div className="bg-[#0e1713]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <HardDrive className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Retention & Pruning</span>
          </div>
          <div className="text-2xl font-black text-white">7-Day Auto Prune</div>
          <p className="text-xs text-slate-400 mt-2">
            Snapshots older than 7 days are pruned automatically. Can be toggled in settings to retain archives indefinitely.
          </p>
        </div>
      </div>

      {/* Multi-Tier Backup Details */}
      <div className="bg-[#0e1713]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          Multi-Tier Vault Coverage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="font-semibold text-blue-300">1. POS Desktop Terminal (/POS/)</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-stored in <code className="text-blue-300">ProgramData/whiz-pos/Backups/POS/</code>. Packages SQLite database, all document transactions, offline sales, KRA credentials, and API connection keys into encrypted <code className="text-amber-400">.whizbak</code>.
            </p>
          </div>

          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="font-semibold text-indigo-300">2. Local Server / Back Office (/Server/)</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-stored in <code className="text-indigo-300">ProgramData/whiz-pos/Backups/Server/</code>. Captures complete <code className="text-emerald-400">local.db</code>, multi-outlet inventories, document templates, logos, and business settings.
            </p>
          </div>

          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="font-semibold text-purple-300">3. Web Portal Cloud Archive</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides multi-tenant encrypted archives with tenant isolation, exportable on-demand for disaster recovery and offsite auditing.
            </p>
          </div>
        </div>
      </div>

      {/* Available Backups Table */}
      <div className="bg-[#0e1713]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            Encrypted Backups on Disk ({backups.length})
          </h2>
          <button
            onClick={fetchBackups}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {isLoading ? 'Scanning for encrypted backups...' : 'No encrypted backups found yet. Click "Generate Encrypted Backup" to create one.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Backup File (.whizbak)</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Encryption</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {backups.map((b) => (
                  <tr key={b.fileName} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-indigo-300 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      {b.fileName}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {formatBytes(b.size)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-semibold">
                        AES-256-GCM
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`${getApiBaseUrl()}/api/backup/download/${encodeURIComponent(b.fileName)}?token=${localStorage.getItem('whiz-token')}`}
                        download={b.fileName}
                        className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
