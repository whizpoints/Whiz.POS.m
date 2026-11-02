import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePosStore, OpenBill } from '../store/posStore';
import { 
  UtensilsCrossed, 
  Search, 
  Receipt, 
  CreditCard, 
  Printer, 
  Trash2, 
  Clock, 
  User, 
  Coffee,
  PlusCircle,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export default function OpenBillsPage() {
  const navigate = useNavigate();
  const { 
    openBills, 
    startSettlingBill, 
    cancelBill, 
    businessSetup 
  } = usePosStore();

  const [searchTerm, setSearchTerm] = useState('');

  const filteredBills = (openBills || []).filter(bill => {
    const q = searchTerm.toLowerCase();
    const table = (bill.tableNumber || '').toLowerCase();
    const guest = (bill.customerName || '').toLowerCase();
    const id = (bill.id || '').toLowerCase();
    const cashier = (bill.cashier || '').toLowerCase();
    return table.includes(q) || guest.includes(q) || id.includes(q) || cashier.includes(q);
  });

  const totalOutstanding = (openBills || []).reduce((sum, b) => sum + (Number(b.total) || 0), 0);

  const handlePay = (bill: OpenBill) => {
    startSettlingBill(bill.id);
  };

  const handleReprint = (bill: OpenBill) => {
    if (window.electron && businessSetup) {
      window.electron.printCustomerBill(bill, businessSetup);
    }
  };

  const handleCancel = async (billId: string) => {
    if (window.confirm('Are you sure you want to cancel and remove this open tab? This action cannot be undone.')) {
      await cancelBill(billId);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
              <UtensilsCrossed className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Active Open Tabs & Bills</h1>
                <span className="bg-amber-500 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black shadow-sm">
                  {openBills.length} Active
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Hospitality & Bar Pay-After-Use System • Click <b className="text-slate-700">"Pay / Settle"</b> to complete checkout via M-Pesa, Cash, or Card.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</div>
              <div className="text-xl font-black text-amber-600 font-mono">
                KES {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-3 rounded-xl transition-all shadow-md shadow-sky-200 active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Order / POS</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search active tabs by table number, guest name, cashier, or bill ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Grid of Open Tabs */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">
            {openBills.length === 0 ? 'No Active Open Tabs' : 'No Matching Open Tabs'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {openBills.length === 0 
              ? 'When orders are issued in Hospitality "Bill Mode", they stay open here until settled.' 
              : `No active tabs match "${searchTerm}". Try a different search term or clear the filter.`}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm px-5 py-3 rounded-xl shadow-lg shadow-amber-200 transition-all active:scale-95"
          >
            <Coffee className="w-4 h-4" />
            <span>Go to POS & Open a Tab</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBills.map(bill => (
            <div
              key={bill.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="inline-block bg-amber-500 text-slate-950 font-black text-sm px-3 py-1 rounded-lg uppercase tracking-wide shadow-sm">
                        {bill.tableNumber}
                      </div>
                      {bill.customerName ? (
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Guest: {bill.customerName}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 mt-2">Walk-in Customer</div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-amber-600 font-mono">
                        KES {Number(bill.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="font-mono">{bill.id}</span>
                    <span>Server: <b className="text-slate-700">{bill.cashier || 'Staff'}</b></span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-5 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Ordered Items ({bill.items.length})
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {bill.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex-1 truncate pr-2">
                          <span className="font-black text-amber-700 mr-2">{it.quantity}x</span>
                          <span className="font-medium text-slate-800">{it.product?.name || (it as any).name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-700 whitespace-nowrap">
                          KES {((it.product?.price || (it as any).price || 0) * it.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {bill.notes && (
                    <div className="mt-3 p-2 bg-amber-50/50 rounded-lg text-xs text-amber-800 border border-amber-100">
                      <b>Notes:</b> {bill.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/30 flex items-center gap-2">
                <button
                  onClick={() => handlePay(bill)}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide rounded-xl shadow-md shadow-emerald-200 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay / Settle</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>

                <button
                  onClick={() => handleReprint(bill)}
                  title="Reprint Customer Proforma Bill"
                  className="p-3 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleCancel(bill.id)}
                  title="Cancel & Remove Open Tab"
                  className="p-3 bg-white border border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-600 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
