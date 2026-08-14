import React, { useEffect, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { Printer, Trash2, Smartphone, User } from 'lucide-react';

const MobileReceiptsPage = () => {
  const { mobileReceipts, loadMobileReceipts, printMobileReceipt, deleteMobileReceipt, currentCashier } = usePosStore(state => ({
    mobileReceipts: state.mobileReceipts,
    loadMobileReceipts: state.loadMobileReceipts,
    printMobileReceipt: state.printMobileReceipt,
    deleteMobileReceipt: state.deleteMobileReceipt,
    currentCashier: state.currentCashier
  }));

  useEffect(() => {
    loadMobileReceipts();
  }, [loadMobileReceipts]);

  // Filter receipts based on logged-in user
  // If user is Admin/Manager, show all.
  // If user is Cashier, show ONLY their receipts.
  const filteredReceipts = useMemo(() => {
      if (!currentCashier) return [];
      if (currentCashier.role === 'admin' || currentCashier.role === 'manager') {
          return mobileReceipts;
      }
      return mobileReceipts.filter(r =>
          (r.cashierName || r.cashierId || '').toLowerCase() === currentCashier.name.toLowerCase() ||
          (r.cashier || '').toLowerCase() === currentCashier.name.toLowerCase()
      );
  }, [mobileReceipts, currentCashier]);

  // Group receipts by Cashier
  const receiptsByCashier = filteredReceipts.reduce((acc, receipt) => {
      const cashier = receipt.cashierName || receipt.cashierId || receipt.cashier || 'Unknown User';
      if (!acc[cashier]) acc[cashier] = [];
      acc[cashier].push(receipt);
      return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Smartphone className="w-8 h-8 text-blue-500" />
            Mobile Receipts Queue
          </h1>
          <p className="text-gray-500">Print pending receipts from mobile devices.</p>
        </div>
        <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold">
          {filteredReceipts.length} Pending
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredReceipts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Printer className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">No pending mobile receipts for you</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(receiptsByCashier).map(([cashier, receipts]) => (
                <div key={cashier} className="bg-gray-100/50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-500 p-2 rounded-lg text-white">
                            <User className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{cashier}</h2>
                        <span className="text-sm bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600 font-medium shadow-sm">
                            {receipts.length} Receipts
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {receipts.map((receipt) => (
                        <div key={receipt._printId || Math.random()} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Received</span>
                                <div className="text-sm font-medium">
                                {receipt._receivedAt ? new Date(receipt._receivedAt).toLocaleTimeString() : 'Unknown'}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-500 uppercase">Total</span>
                                <div className="text-lg font-bold text-emerald-600">
                                KES {(receipt.total || 0).toLocaleString()}
                                </div>
                            </div>
                            </div>

                            <div className="p-4 flex-1 space-y-2">
                            <div className="text-sm text-gray-600">
                                <span className="font-medium">Items:</span> {(receipt.items || []).length}
                            </div>
                            <div className="text-xs text-gray-400 mt-2 font-mono">
                                ID: {receipt.id || 'N/A'}
                            </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                            <button
                                onClick={() => printMobileReceipt(receipt)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button
                                onClick={() => deleteMobileReceipt(receipt)}
                                className="px-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                                title="Delete without printing"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileReceiptsPage;
