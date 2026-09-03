import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, XCircle, ChevronLeft, ScanLine } from 'lucide-react';
// import { useTheme } from '../App';

export default function VerifyDocument() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  // const { theme } = useTheme();

  useEffect(() => {
    fetch(`/api/verify/${code}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl text-center border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Invalid Document</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">This verification code is invalid, expired, or the document is not authentic.</p>
          <div className="flex gap-3 justify-center">
              <Link to="/dashboard" className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const { business, type, date, total, customerName, items } = data;
  const currency = business.settings ? (JSON.parse(business.settings).currency || 'KES') : 'KES';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-6 px-2">
           <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">
               <ChevronLeft className="w-4 h-4" /> Dashboard
           </Link>
           <button onClick={() => alert('Point your camera at a QR code')} className="flex items-center gap-2 text-sm font-semibold text-white bg-[var(--accent-primary)] px-4 py-2 rounded-full shadow-sm hover:opacity-90 transition-colors">
               <ScanLine className="w-4 h-4" /> Scan
           </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 sm:p-10 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="text-center mb-8">
            {business.logoUrl ? (
                <img src={business.logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
            ) : (
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShieldCheck className="w-8 h-8" />
                </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{business.name}</h1>
            <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest">{type}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                 <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Date Issued</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Status</p>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                 </div>
              </div>
              <div>
                 <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Billed To</p>
                 <p className="font-bold text-slate-800 dark:text-slate-200">{customerName}</p>
              </div>
          </div>

          <div className="mb-6">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-3 px-2">Order Items</p>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
              <div className="max-h-60 overflow-y-auto px-3">
                {items.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{i.description || i.name}</span>
                          <span className="text-xs text-slate-500">{i.quantity} x {(i.total / (i.quantity||1)).toLocaleString()}</span>
                      </div>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">{Number(i.total).toLocaleString()}</span>
                    </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-black rounded-2xl p-6 text-white flex justify-between items-center shadow-lg">
             <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Total Amount</span>
             <span className="text-3xl font-black">{currency} {Number(total).toLocaleString()}</span>
          </div>
          
          <div className="mt-8 text-center text-xs text-slate-400 font-medium">
             <p>This document was securely generated and cryptographically verified by <a href="https://whizpoint.app" className="text-[var(--accent-primary)] font-bold hover:underline">WhizPOS</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
