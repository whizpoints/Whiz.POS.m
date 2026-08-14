import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { 
  ShieldAlert, Lock, Unlock, UserCheck, AlertTriangle, Search, FileText, CheckCircle2, XCircle
} from 'lucide-react';

export default function ShiftAuditPage() {
  const { transactions, users } = usePosStore();
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'voids' | 'drawer'>('reconciliation');
  const [selectedCashier, setSelectedCashier] = useState('all');

  // Generate some mock voided transactions or suspicious activities
  const voidedTransactions = transactions
    .filter(t => t.status === 'refunded' || t.status === 'pending')
    .filter(t => selectedCashier === 'all' || t.cashier === selectedCashier);

  // Mock Drawer Open logs (in a real system, these would be logged in posStore when the drawer kicks open without a sale)
  const drawerLogs = [
    { id: 1, time: new Date(Date.now() - 3600000).toISOString(), cashier: 'John Doe', reason: 'Change for customer', authorizedBy: 'Manager' },
    { id: 2, time: new Date(Date.now() - 7200000).toISOString(), cashier: 'Jane Smith', reason: 'End of shift audit', authorizedBy: 'Self' },
    { id: 3, time: new Date(Date.now() - 86400000).toISOString(), cashier: 'John Doe', reason: 'No sale (Suspicious)', authorizedBy: 'None' },
  ].filter(log => selectedCashier === 'all' || log.cashier === selectedCashier);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-8 h-8 text-rose-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Shift History & Loss Prevention</h1>
                <p className="text-gray-600">Audit trails, void tracking, and blind shift reconciliation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
               <span className="text-sm font-bold text-gray-500">Filter by Cashier:</span>
               <select value={selectedCashier} onChange={(e) => setSelectedCashier(e.target.value)} className="p-2 border border-gray-300 rounded-lg">
                 <option value="all">All Cashiers</option>
                 {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                 <option value="John Doe">John Doe (Demo)</option>
                 <option value="Jane Smith">Jane Smith (Demo)</option>
               </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('reconciliation')} className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reconciliation' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
              <UserCheck className="w-5 h-5 mr-2" /> Blind Shift Reconciliation
            </button>
            <button onClick={() => setActiveTab('voids')} className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'voids' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
              <AlertTriangle className="w-5 h-5 mr-2" /> Voids & Discounts Log
            </button>
            <button onClick={() => setActiveTab('drawer')} className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'drawer' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
              <Unlock className="w-5 h-5 mr-2" /> Drawer Open Logs (No Sale)
            </button>
          </div>
        </div>

        {/* Blind Shift Reconciliation */}
        {activeTab === 'reconciliation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
               <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Lock className="w-5 h-5 mr-2 text-rose-500"/> Declare Shift Totals (Blind)</h2>
               <p className="text-sm text-gray-500 mb-6">Cashiers enter counted totals before seeing the system expected totals. Variances are logged.</p>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Counted Cash in Drawer</label>
                   <input type="number" placeholder="KES 0.00" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">M-Pesa Receipts Counted</label>
                   <input type="number" placeholder="KES 0.00" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Card PDQ Slips Total</label>
                   <input type="number" placeholder="KES 0.00" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500" />
                 </div>
                 <button className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 transition-colors">
                   Submit Blind Count & End Shift
                 </button>
               </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-sm p-6 text-white">
               <h2 className="text-xl font-bold mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-rose-400"/> System Expected Totals (Manager Only)</h2>
               <div className="bg-gray-900 rounded-lg p-4 space-y-3 font-mono text-sm">
                 <div className="flex justify-between border-b border-gray-700 pb-2"><span>Expected Cash:</span><span className="text-emerald-400">KES 12,500.00</span></div>
                 <div className="flex justify-between border-b border-gray-700 pb-2"><span>Expected M-Pesa:</span><span className="text-emerald-400">KES 8,300.00</span></div>
                 <div className="flex justify-between border-b border-gray-700 pb-2"><span>Expected Card:</span><span className="text-emerald-400">KES 4,200.00</span></div>
                 <div className="flex justify-between font-bold pt-2 text-lg"><span>Total Shift Value:</span><span className="text-blue-400">KES 25,000.00</span></div>
               </div>
               
               <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500 rounded-lg">
                 <h3 className="font-bold text-rose-300 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Active Variance Alert</h3>
                 <p className="text-sm mt-1 text-rose-100">Jane Smith's last shift reported a KES -500.00 cash variance. Investigation required.</p>
               </div>
            </div>
          </div>
        )}

        {/* Voids & Discounts Log */}
        {activeTab === 'voids' && (
           <div className="bg-white rounded-xl shadow-sm p-6">
             <h2 className="text-xl font-bold text-gray-800 mb-6">Suspicious Transactions (Voids & High Discounts)</h2>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-gray-50 border-b">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Txn ID</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value Lost</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authorized By</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {voidedTransactions.map((t, idx) => (
                     <tr key={idx} className="hover:bg-gray-50">
                       <td className="px-6 py-4 font-mono text-sm">{t.id.substring(0, 8)}...</td>
                       <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.timestamp).toLocaleString()}</td>
                       <td className="px-6 py-4 font-medium">{t.cashier}</td>
                       <td className="px-6 py-4">
                         <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold">VOIDED SALE</span>
                       </td>
                       <td className="px-6 py-4 font-bold text-gray-800">KES {t.total.toLocaleString()}</td>
                       <td className="px-6 py-4 text-sm text-gray-500">Manager PIN (1234)</td>
                     </tr>
                   ))}
                   {voidedTransactions.length === 0 && (
                     <tr><td colSpan={6} className="text-center py-8 text-gray-500">No suspicious transactions found for this filter.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        )}

        {/* Drawer Open Logs */}
        {activeTab === 'drawer' && (
           <div className="bg-white rounded-xl shadow-sm p-6">
             <h2 className="text-xl font-bold text-gray-800 mb-6">"No Sale" Drawer Opens</h2>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-gray-50 border-b">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason Given</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authorization</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {drawerLogs.map((log, idx) => (
                     <tr key={idx} className="hover:bg-gray-50">
                       <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.time).toLocaleString()}</td>
                       <td className="px-6 py-4 font-medium">{log.cashier}</td>
                       <td className="px-6 py-4 text-sm">{log.reason}</td>
                       <td className="px-6 py-4 text-sm font-mono">{log.authorizedBy}</td>
                       <td className="px-6 py-4">
                         {log.authorizedBy === 'None' ? (
                           <span className="flex items-center text-rose-600 font-bold text-sm"><XCircle className="w-4 h-4 mr-1"/> HIGH</span>
                         ) : (
                           <span className="flex items-center text-emerald-600 font-bold text-sm"><CheckCircle2 className="w-4 h-4 mr-1"/> LOW</span>
                         )}
                       </td>
                     </tr>
                   ))}
                   {drawerLogs.length === 0 && (
                     <tr><td colSpan={5} className="text-center py-8 text-gray-500">No drawer logs found.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        )}

      </div>
    </div>
  );
}
