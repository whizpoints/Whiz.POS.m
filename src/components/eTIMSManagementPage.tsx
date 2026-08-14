import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { usePosStore } from '../store/posStore';
import { 
  FileCheck2, AlertCircle, RefreshCw, ServerOff, Server, Calendar, Hash, FileText
} from 'lucide-react';

export default function ETIMSManagementPage() {
  const { transactions } = usePosStore();
  const [isSyncing, setIsSyncing] = useState(false);

  // Mock eTIMS data state based on transactions
  // For demonstration, we'll assume recent transactions are "SYNCED" and maybe some are "PENDING"
  const pendingTransactions = transactions.filter(t => t.status === 'completed' && t.total > 5000); // arbitrarily mock some pending
  const syncedTransactions = transactions.filter(t => t.status === 'completed' && t.total <= 5000); 

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      toast.success(`Successfully synchronized ${pendingTransactions.length} receipts to KRA eTIMS.`);
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileCheck2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">KRA eTIMS Audit Monitor</h1>
                <p className="text-gray-600">Track and manage electronic tax invoice synchronization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold border border-emerald-200">
                 <Server className="w-5 h-5"/>
                 <span>VSCU Online</span>
               </div>
               <button 
                 onClick={handleForceSync}
                 disabled={isSyncing || pendingTransactions.length === 0}
                 className={`flex items-center px-4 py-2 rounded-lg font-bold transition-colors ${
                   isSyncing ? 'bg-gray-400 text-white cursor-not-allowed' : 
                   pendingTransactions.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 
                   'bg-emerald-600 hover:bg-emerald-700 text-white'
                 }`}
               >
                 <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                 {isSyncing ? 'Syncing...' : 'Force Re-sync Queue'}
               </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
               <p className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Offline Queue (Pending)</p>
               <p className="text-3xl font-black text-rose-600">{pendingTransactions.length}</p>
             </div>
             <div className="p-4 bg-rose-50 rounded-full">
               <ServerOff className="w-8 h-8 text-rose-500" />
             </div>
           </div>
           
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
               <p className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Successfully Synced</p>
               <p className="text-3xl font-black text-emerald-600">{syncedTransactions.length}</p>
             </div>
             <div className="p-4 bg-emerald-50 rounded-full">
               <FileCheck2 className="w-8 h-8 text-emerald-500" />
             </div>
           </div>
           
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
             <div>
               <p className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Total Tax Declared</p>
               <p className="text-3xl font-black text-gray-800">
                 KES {transactions.reduce((sum, t) => sum + (t.tax || 0), 0).toLocaleString()}
               </p>
             </div>
             <div className="p-4 bg-blue-50 rounded-full">
               <FileText className="w-8 h-8 text-blue-500" />
             </div>
           </div>
        </div>

        {/* Pending Queue Table */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-rose-100 mb-6">
           <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center text-rose-700">
             <AlertCircle className="w-5 h-5 mr-2" /> Pending Synchronization Queue
           </h2>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50 border-b">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt No</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Total</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                 {pendingTransactions.map(t => (
                   <tr key={t.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 font-mono font-bold text-gray-800">{t.id}</td>
                     <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                       <Calendar className="w-4 h-4 mr-2 text-gray-400"/> {new Date(t.timestamp).toLocaleString()}
                     </td>
                     <td className="px-6 py-4 font-bold text-gray-800">KES {t.total.toLocaleString()}</td>
                     <td className="px-6 py-4 font-bold text-gray-600">KES {(t.tax || 0).toLocaleString()}</td>
                     <td className="px-6 py-4">
                       <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider">
                         Pending Sync
                       </span>
                     </td>
                   </tr>
                 ))}
                 {pendingTransactions.length === 0 && (
                   <tr><td colSpan={5} className="text-center py-8 text-gray-500">All receipts have been successfully synchronized.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* Synced Table */}
        <div className="bg-white rounded-xl shadow-sm p-6">
           <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center text-emerald-700">
             <FileCheck2 className="w-5 h-5 mr-2" /> Recently Synchronized Receipts
           </h2>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50 border-b">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt No</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">eTIMS CU Invoice No</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Total</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                 {syncedTransactions.slice(0, 50).map((t, idx) => (
                   <tr key={t.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 font-mono font-bold text-gray-800">{t.id}</td>
                     <td className="px-6 py-4 font-mono text-sm text-gray-500">
                        {/* Mock CU Invoice Number */}
                        WHIZ-0{idx}3-0000{t.id.substring(0, 4)}
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(t.timestamp).toLocaleString()}
                     </td>
                     <td className="px-6 py-4 font-bold text-gray-800">KES {t.total.toLocaleString()}</td>
                     <td className="px-6 py-4">
                       <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider flex w-fit items-center">
                         <FileCheck2 className="w-3 h-3 mr-1"/> Synced
                       </span>
                     </td>
                   </tr>
                 ))}
                 {syncedTransactions.length === 0 && (
                   <tr><td colSpan={5} className="text-center py-8 text-gray-500">No synchronized receipts found.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}
