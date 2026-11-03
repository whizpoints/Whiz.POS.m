import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store/posStore';
import { X, ShoppingBag } from 'lucide-react';
import { Modal } from '../ui/modal';
import PaymentMethodSelector from './PaymentMethodSelector';
import CashPayment from './CashPayment';
import MpesaPayment from './MpesaPayment';
import CardPayment from './CardPayment';
import BankChequePayment from './BankChequePayment';
import CreditPayment from './CreditPayment';
import KeyboardShortcuts from './KeyboardShortcuts';
import SearchModal from './MpesaPayment/SearchModal';
import { Banknote, CreditCard, Landmark, UserCheck, Search } from 'lucide-react';

export type PaymentMethodType = 'cash' | 'mpesa' | 'card' | 'bank' | 'credit';

export default function CheckoutModal() {
  const { isCheckoutOpen, closeCheckout, cart, completeTransaction, currentCashier, activeSettlingBillId, openBills } = usePosStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('cash');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  // Active bill if settling an open tab
  const activeBill = activeSettlingBillId 
    ? (openBills || []).find(b => b.id === activeSettlingBillId) 
    : null;

  // Calculate total
  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Format currency properly KSh 4,850.00
  const formattedTotal = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(totalAmount).replace('KES', 'KSh');

  // Reset to cash when opened
  useEffect(() => {
    if (isCheckoutOpen) {
      setSelectedMethod('cash');
      setShowMobileSummary(false);
    }
  }, [isCheckoutOpen]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCheckoutOpen) {
        closeCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, closeCheckout]);

  /** Called when cashier picks a payment from SearchModal — completes the sale */
  const handlePaymentSelected = (txn: { transactionId: string; amount: number; phoneNumber: string; customerName: string | null }) => {
    completeTransaction('mpesa', undefined, {
      mpesaCode: txn.transactionId,
      phoneNumber: txn.phoneNumber,
      customerName: txn.customerName || 'M-Pesa Customer',
      mpesaName: txn.customerName || 'M-Pesa Customer',
      amountTendered: txn.amount
    });
  };

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <KeyboardShortcuts onMethodSelect={setSelectedMethod} onClose={closeCheckout} />
      
      <div className="bg-white w-full max-w-7xl 2xl:max-w-[1440px] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[94vh] border border-gray-200">
        {/* Header */}
        <div className="bg-gray-50 px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-4">
            {selectedMethod === 'cash' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Cash Payment</h3>
                  <p className="text-[10px] text-gray-500">Enter cash received & calculate change</p>
                </div>
              </div>
            )}
            {selectedMethod === 'mpesa' && (
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="h-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">M-Pesa Express & Till</h3>
                  <p className="text-[10px] text-gray-500">Scan QR, STK Push, or Till Confirmation</p>
                </div>
              </div>
            )}
            {selectedMethod === 'card' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Card Payment</h3>
                  <p className="text-[10px] text-gray-500">Swipe or tap via PDQ POS machine</p>
                </div>
              </div>
            )}
            {selectedMethod === 'bank' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Bank / Cheque</h3>
                  <p className="text-[10px] text-gray-500">Record direct electronic transfer</p>
                </div>
              </div>
            )}
            {selectedMethod === 'credit' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Credit Sale (Account Tab)</h3>
                  <p className="text-[10px] text-gray-500">Assign sale balance to verified customer</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 md:gap-5">
            {selectedMethod === 'mpesa' && (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm animate-in fade-in"
              >
                <Search className="w-3.5 h-3.5" />
                Search Payment
              </button>
            )}

            {/* Mobile Summary Toggle */}
            <button
              onClick={() => setShowMobileSummary(!showMobileSummary)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
              <span>{showMobileSummary ? 'Hide Items' : `Items (${cart.length})`}</span>
            </button>

            <div className="text-right pl-3 border-l border-gray-200">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Amount Due</p>
              <p className="text-xl md:text-2xl font-black text-gray-900 font-mono tracking-tight">{formattedTotal}</p>
            </div>
            
            <button 
              onClick={closeCheckout}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900"
              title="Close (ESC)"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* 3-Column Main Body Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
          
          {/* Column 1: Payment Method Selector */}
          <div className="w-full md:w-64 md:min-w-[240px] bg-gray-50/70 border-b md:border-b-0 md:border-r border-gray-200 p-4 md:p-5 overflow-x-auto md:overflow-y-auto shrink-0 flex flex-col justify-between">
            <div>
              <h3 className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Method</h3>
              <PaymentMethodSelector 
                selected={selectedMethod} 
                onSelect={setSelectedMethod} 
              />
            </div>
            
            <div className="hidden md:block mt-6 pt-5 border-t border-gray-200">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">POS Hotkeys</h4>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between items-center"><span>Cash</span> <kbd className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-mono shadow-2xs">F1</kbd></div>
                <div className="flex justify-between items-center"><span>M-Pesa</span> <kbd className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-mono shadow-2xs">F2</kbd></div>
                <div className="flex justify-between items-center"><span>Bank/Transfer</span> <kbd className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-mono shadow-2xs">F3</kbd></div>
                <div className="flex justify-between items-center"><span>Card PDQ</span> <kbd className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-mono shadow-2xs">F4</kbd></div>
                <div className="flex justify-between items-center"><span>Credit Tab</span> <kbd className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-mono shadow-2xs">F5</kbd></div>
              </div>
            </div>
          </div>

          {/* Column 2: Dynamic Payment Tender Area */}
          <div className="flex-1 p-3 md:p-6 overflow-y-auto bg-white flex flex-col min-w-0">
            {selectedMethod === 'cash' && <CashPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'mpesa' && <MpesaPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'card' && <CardPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'bank' && <BankChequePayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'credit' && <CreditPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
          </div>

          {/* Column 3: Order Summary (Items Being Sold) */}
          <div className={`${showMobileSummary ? 'flex absolute inset-0 z-20 bg-white' : 'hidden'} lg:flex w-full lg:w-84 xl:w-96 bg-slate-50/90 border-t lg:border-t-0 lg:border-l border-gray-200 flex-col overflow-hidden shrink-0`}>
            {/* Summary Header */}
            <div className="p-3.5 border-b border-gray-200/90 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">Items in Sale</h4>
                  <p className="text-[11px] text-gray-500">{totalUnits} units • {cart.length} distinct items</p>
                </div>
              </div>
              {activeBill && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">
                  Tab #{activeBill.id?.slice(-4)}
                </span>
              )}
              {showMobileSummary && (
                <button
                  onClick={() => setShowMobileSummary(false)}
                  className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-8">
                  <ShoppingBag className="w-8 h-8 mb-2 opacity-30" />
                  <p>No items in current transaction</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const lineTotal = item.product.price * item.quantity;
                  return (
                    <div 
                      key={item.product.id || idx} 
                      className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-200 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate leading-snug">{item.product.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            {item.quantity} ×
                          </span>
                          <span>KSh {Number(item.product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-gray-900">
                          KSh {Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Summary Totals & Cashier Info */}
            <div className="p-4 bg-white border-t border-gray-200 space-y-2 shrink-0">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal ({cart.length} lines)</span>
                <span className="font-mono font-medium text-gray-700">{formattedTotal}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>VAT / Tax (0%)</span>
                <span className="font-mono font-medium text-gray-700">KSh 0.00</span>
              </div>
              <div className="pt-2.5 border-t border-dashed border-gray-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">Grand Total</span>
                  {currentCashier && (
                    <p className="text-[10px] text-gray-400">Cashier: {currentCashier.name}</p>
                  )}
                </div>
                <span className="text-xl font-black text-emerald-600 font-mono tracking-tight">
                  {formattedTotal}
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {isSearchOpen && (
        <SearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          targetAmount={totalAmount}
          onSelect={handlePaymentSelected}
        />
      )}
    </div>
  );
}

