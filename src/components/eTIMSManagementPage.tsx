import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { usePosStore, Transaction } from '../store/posStore';
import { 
  FileCheck2, AlertCircle, RefreshCw, ServerOff, Server, Calendar, Hash, FileText, ExternalLink, ShieldCheck, CheckCircle
} from 'lucide-react';

export default function ETIMSManagementPage() {
  const { transactions, businessSetup, submitKraInvoice, updateTransaction, isOnline } = usePosStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const configuredPin = businessSetup?.kraPin || businessSetup?.etimsPin || '';
  const isKraConfigured = !!configuredPin;

  // Real eTIMS synced vs pending transactions based on real eTIMS signatures or receipt numbers
  const syncedTransactions = transactions.filter(t => 
    t.status === 'completed' && 
    Boolean(t.kraDetails?.receiptNumber || t.kraDetails?.controlCode || t.kraDetails?.qrCode || (t as any).kraInvoiceNo)
  );

  const pendingTransactions = transactions.filter(t => 
    t.status === 'completed' && 
    !Boolean(t.kraDetails?.receiptNumber || t.kraDetails?.controlCode || t.kraDetails?.qrCode || (t as any).kraInvoiceNo)
  );

  // Sync a single pending transaction to KRA
  const handleSyncSingle = async (transaction: Transaction) => {
    try {
      setSyncingId(transaction.id);
      const kraDetails = await submitKraInvoice(transaction);
      if (kraDetails) {
        updateTransaction({
          ...transaction,
          kraDetails
        });
        toast.success(`Receipt #${transaction.id} transmitted to KRA eTIMS!`);
      } else {
        toast.error(`Unable to transmit #${transaction.id}. Verify network & KRA PIN.`);
      }
    } catch (err: any) {
      toast.error(`Sync error: ${err.message || 'Failed to submit invoice'}`);
    } finally {
      setSyncingId(null);
    }
  };

  // Force re-sync queue for all pending transactions
  const handleForceSync = async () => {
    if (pendingTransactions.length === 0) return;
    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (const transaction of pendingTransactions) {
      try {
        const kraDetails = await submitKraInvoice(transaction);
        if (kraDetails) {
          updateTransaction({
            ...transaction,
            kraDetails
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsSyncing(false);
    if (successCount > 0) {
      toast.success(`Successfully transmitted ${successCount} invoices to KRA eTIMS!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} invoices could not be synchronized.`);
    }
  };

  // Open KRA verification link in external browser
  const handleVerifyWithKra = (t: Transaction) => {
    const qrUrl = t.kraDetails?.qrCode || (t as any).kraQrCode;
    if (qrUrl) {
      window.open(qrUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('No KRA verification QR URL on this receipt.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <FileCheck2 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KRA eTIMS Audit Monitor</h1>
                <p className="text-sm text-gray-600">Track, transmit, and verify electronic tax invoices (VSCU/OSCU)</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 flex-wrap">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                isKraConfigured 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isKraConfigured ? <ShieldCheck className="w-4 h-4 text-emerald-600"/> : <AlertCircle className="w-4 h-4 text-amber-600"/>}
                <span>{isKraConfigured ? `PIN: ${configuredPin}` : 'No PIN Configured'}</span>
              </div>

              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                isOnline ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                <Server className="w-4 h-4"/>
                <span>{isOnline ? 'System Online' : 'Offline Mode'}</span>
              </div>

              <button 
                onClick={handleForceSync}
                disabled={isSyncing || pendingTransactions.length === 0}
                className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${
                  isSyncing ? 'bg-gray-400 text-white cursor-not-allowed' : 
                  pendingTransactions.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 
                  'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Transmitting Queue...' : `Force Re-sync (${pendingTransactions.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Pending Synchronization</p>
              <p className="text-3xl font-black text-rose-600">{pendingTransactions.length}</p>
              <p className="text-xs text-rose-500 mt-1">Receipts awaiting eTIMS submission</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl">
              <ServerOff className="w-8 h-8 text-rose-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Transmitted to KRA</p>
              <p className="text-3xl font-black text-emerald-600">{syncedTransactions.length}</p>
              <p className="text-xs text-emerald-600 mt-1">Verified with valid signatures</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 font-bold mb-1 uppercase text-xs tracking-wider">Total Tax Declared</p>
              <p className="text-3xl font-black text-gray-900">
                KES {transactions.reduce((sum, t) => sum + (t.tax || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">Calculated 16% VAT value</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Pending Queue Table */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-rose-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-rose-800 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-rose-600" /> Pending Synchronization Queue
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
              {pendingTransactions.length} pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Receipt No</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Gross Total</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Tax Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingTransactions.slice(0, 50).map(t => (
                  <tr key={t.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 text-sm">{t.id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400"/>
                        {new Date(t.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded font-mono font-semibold bg-gray-100 text-gray-700 uppercase">
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 text-sm">KES {t.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">KES {(t.tax || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSyncSingle(t)}
                        disabled={syncingId === t.id}
                        className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingId === t.id ? 'animate-spin' : ''}`} />
                        {syncingId === t.id ? 'Syncing...' : 'Sync to KRA'}
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                      All sales receipts are fully synchronized with KRA eTIMS!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Synced Table */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-emerald-800 flex items-center">
              <FileCheck2 className="w-5 h-5 mr-2 text-emerald-600" /> Transmitted & Verified Invoices
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {syncedTransactions.length} synchronized
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Receipt No</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">KRA CU Receipt / Invoice</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Control Code</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syncedTransactions.slice(0, 50).map((t) => {
                  const receiptNo = t.kraDetails?.receiptNumber || t.kraDetails?.invoiceNumber || (t as any).kraInvoiceNo || 'N/A';
                  const controlCode = t.kraDetails?.controlCode || (t as any).kraSignature || 'VERIFIED';
                  const qrUrl = t.kraDetails?.qrCode || (t as any).kraQrCode;

                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 text-sm">{t.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold">
                        {receiptNo}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(t.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-[11px] text-gray-700">
                          {controlCode.slice(0, 16)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 text-sm">KES {t.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {qrUrl ? (
                          <button
                            onClick={() => handleVerifyWithKra(t)}
                            className="btn btn-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-sm transition-colors"
                            title="Verify on KRA Public Verification Portal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Verify with KRA
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No QR link</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {syncedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                      No synchronized receipts found yet. Complete sales with KRA enabled to populate this list.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
