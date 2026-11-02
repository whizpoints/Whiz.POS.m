import React, { useState } from 'react';
import { usePosStore, OpenBill } from '../../store/posStore';
import { 
  X, Search, Receipt, CreditCard, Banknote, Smartphone, 
  Trash2, Printer, CheckCircle2, Clock, UtensilsCrossed 
} from 'lucide-react';

export default function OpenBillsModal() {
  const { 
    openBills, 
    isOpenBillsModalOpen, 
    closeOpenBillsModal, 
    settleBill, 
    cancelBill,
    businessSetup 
  } = usePosStore();

  const [search, setSearch] = useState('');
  const [settlingBill, setSettlingBill] = useState<OpenBill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'credit'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [printReceiptOnSettle, setPrintReceiptOnSettle] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpenBillsModalOpen) return null;

  const filteredBills = (openBills || []).filter(b => {
    const q = search.toLowerCase();
    return (
      b.tableNumber.toLowerCase().includes(q) ||
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      b.id.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = (openBills || []).reduce((sum, b) => sum + (Number(b.total) || 0), 0);

  const startSettling = (bill: OpenBill) => {
    setSettlingBill(bill);
    setPaymentMethod('cash');
    setTenderedAmount(String(bill.total));
    setMpesaCode('');
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingBill) return;

    setIsSubmitting(true);
    try {
      const additionalData: any = {
        amountTendered: Number(tenderedAmount) || settlingBill.total,
        change: Math.max(0, (Number(tenderedAmount) || settlingBill.total) - settlingBill.total),
        customerName: settlingBill.customerName
      };

      if (paymentMethod === 'mpesa') {
        additionalData.mpesaCode = mpesaCode.trim() || `MP${Date.now().toString().slice(-6)}`;
      }

      await settleBill(settlingBill.id, paymentMethod, additionalData, printReceiptOnSettle);
      setSettlingBill(null);
    } catch (err: any) {
      alert(`Error settling bill: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprint = (bill: OpenBill) => {
    if (window.electron && businessSetup) {
      window.electron.printCustomerBill(bill, businessSetup);
    }
  };

  const handleCancel = async (billId: string) => {
    if (window.confirm('Are you sure you want to cancel and remove this open tab?')) {
      await cancelBill(billId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
                ACTIVE OPEN TABS / BILLS
                <span className="bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                  {openBills.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hospitality pay-after-use tabs • Total Outstanding: <span className="text-amber-400 font-bold">KES {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={closeOpenBillsModal}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Table number, Guest name, or Bill ID..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredBills.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-bold text-gray-600">No active open tabs found</p>
              <p className="text-xs text-gray-400 mt-1">
                When you click "Print Bill (Open Tab)" in the cart, open bills will appear here until settled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBills.map(bill => (
                <div 
                  key={bill.id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-amber-400 shadow-sm hover:shadow transition-all p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {bill.id}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-1">
                          {bill.tableNumber}
                        </h3>
                        {bill.customerName && (
                          <p className="text-xs font-semibold text-slate-600">
                            Guest: {bill.customerName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-600 block">
                          KES {Number(bill.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-gray-50 rounded-lg p-2.5 my-3 space-y-1 max-h-24 overflow-y-auto text-xs text-gray-600">
                      {bill.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate pr-2">{it.quantity}x {it.product?.name || (it as any).name}</span>
                          <span className="font-mono font-semibold">KES {((it.product?.price || (it as any).price || 0) * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                    <button 
                      onClick={() => startSettling(bill)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      SETTLE BILL
                    </button>
                    <button 
                      onClick={() => handleReprint(bill)}
                      title="Reprint Customer Bill"
                      className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleCancel(bill.id)}
                      title="Cancel Tab"
                      className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div>
            <span>Operating in <b>Hospitality / Bill Mode</b></span>
          </div>
          <button 
            onClick={closeOpenBillsModal}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Settle Bill Modal */}
      {settlingBill && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Settle Tab: {settlingBill.tableNumber}</h3>
                <p className="text-xs text-emerald-100">Bill #{settlingBill.id} • KES {settlingBill.total.toFixed(2)}</p>
              </div>
              <button onClick={() => setSettlingBill(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Banknote className="w-4 h-4" /> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${paymentMethod === 'mpesa' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Smartphone className="w-4 h-4" /> M-Pesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${paymentMethod === 'credit' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <CreditCard className="w-4 h-4" /> Credit
                  </button>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Cash Tendered (KES)
                  </label>
                  <input 
                    type="number"
                    step="any"
                    value={tenderedAmount}
                    onChange={e => setTenderedAmount(e.target.value)}
                    className="w-full text-xl font-bold p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  {Number(tenderedAmount) > settlingBill.total && (
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      Change Due: KES {(Number(tenderedAmount) - settlingBill.total).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {paymentMethod === 'mpesa' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    M-Pesa Confirmation Code (Optional)
                  </label>
                  <input 
                    type="text"
                    value={mpesaCode}
                    onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                    placeholder="e.g. QX8291..."
                    className="w-full font-mono font-bold p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 uppercase"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input 
                    type="checkbox"
                    checked={printReceiptOnSettle}
                    onChange={e => setPrintReceiptOnSettle(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Print Final Fiscal Tax Receipt
                </label>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSettlingBill(null)}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  CONFIRM & SETTLE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
