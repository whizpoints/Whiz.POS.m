import { useState } from 'react';
import { Send, Users, ShieldAlert, Sparkles, AlertTriangle, Play, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminBroadcasts() {
  const [target, setTarget] = useState('ACTIVE_TENANTS');
  const [testEmail, setTestEmail] = useState('');
  const [fromName, setFromName] = useState('WhizPoint Updates');
  const [fromEmail, setFromEmail] = useState('updates'); // Just the alias part, domain is forced
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState(`<!-- Paste your HTML here -->
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #4f46e5;">System Update</h2>
  <p>Hello,</p>
  <p>We are rolling out some exciting new features to your dashboard...</p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  <p style="font-size: 12px; color: #6b7280; text-align: center;">Whiz POS Cloud</p>
</div>`);
  const [isPreview, setIsPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const targets = [
    { id: 'ACTIVE_TENANTS', label: 'Active Businesses', desc: 'Owners of active, paying, or free businesses', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'SUSPENDED_TENANTS', label: 'Suspended Businesses', desc: 'Reach out to deactivated accounts', icon: <AlertTriangle className="w-5 h-5" /> },
    { id: 'ALL_USERS', label: 'Everyone (Danger)', desc: 'Literally every registered user including staff', icon: <Users className="w-5 h-5" /> },
    { id: 'TEST', label: 'Test Email', desc: 'Send a single preview to yourself first', icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error('Subject and Body are required.');
      return;
    }
    if (target === 'TEST' && !testEmail) {
      toast.error('Test email address is required.');
      return;
    }

    if (!window.confirm(`Are you sure you want to broadcast this to: ${targets.find(t => t.id === target)?.label}?`)) return;

    setIsSending(true);
    const toastId = toast.loading('Dispatching emails via Brevo...');

    try {
      const token = localStorage.getItem('whiz-token');
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          target,
          testEmail: target === 'TEST' ? testEmail : undefined,
          fromName,
          fromEmail,
          subject,
          htmlBody
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message, { id: toastId });
      } else {
        toast.error(data.error || 'Broadcast failed', { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error. Check logs.', { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Broadcast Engine</h1>
        <p className="text-slate-400 text-sm mt-1">Send beautiful HTML emails to your user base via Brevo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white/[0.05] border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> Audience</h3>
            <div className="space-y-3">
              {targets.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setTarget(t.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    target === t.id 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="mt-0.5">{t.icon}</div>
                  <div>
                    <div className={`font-bold text-sm ${target === t.id ? 'text-emerald-400' : 'text-slate-300'}`}>{t.label}</div>
                    <div className="text-[11px] opacity-80">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {target === 'TEST' && (
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Test Email Address</label>
                <input 
                  type="email" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            )}
          </div>

          <div className="bg-white/[0.05] border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] space-y-4">
            <h3 className="text-white font-bold flex items-center gap-2"><Send className="w-4 h-4 text-[#0A9EF5]" /> Sender Configuration</h3>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Name</label>
              <input 
                type="text" 
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#0A9EF5]/50 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Email Alias</label>
              <div className="flex items-center">
                <input 
                  type="text" 
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                  className="w-full bg-black/40 border border-white/10 rounded-l-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#0A9EF5]/50 transition-all text-right"
                />
                <div className="bg-black/60 border border-l-0 border-white/10 rounded-r-xl px-4 py-2 text-sm text-slate-400">
                  @whizpoint.app
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-2 bg-white/[0.05] border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col">
          
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject Line</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Major Security Update"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Body (HTML Supported)</label>
            <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setIsPreview(false)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isPreview ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Code
              </button>
              <button 
                onClick={() => setIsPreview(true)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${isPreview ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[400px] relative rounded-xl overflow-hidden border border-white/10 bg-black/40">
            {isPreview ? (
              <div className="absolute inset-0 bg-white overflow-auto p-8">
                <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
              </div>
            ) : (
              <textarea 
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-emerald-400 font-mono text-sm focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black tracking-wide uppercase text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>Dispatching...</>
              ) : (
                <><Play className="w-4 h-4 fill-current" /> Fire Broadcast</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
