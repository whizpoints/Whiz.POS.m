import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store/posStore';
import { X } from 'lucide-react';
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
  const { isCheckoutOpen, closeCheckout, cart } = usePosStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('cash');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Calculate total
  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
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
    }
  }, [isCheckoutOpen]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCheckoutOpen) {
        // We will enhance this later with a confirmation dialogue if payment is in progress
        closeCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, closeCheckout]);

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <KeyboardShortcuts onMethodSelect={setSelectedMethod} onClose={closeCheckout} />
      
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-auto md:max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 px-4 md:px-6 py-2 flex items-center justify-between border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4">
            {selectedMethod === 'cash' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Cash Payment</h3>
                  <p className="text-[10px] text-gray-500">Enter amount received</p>
                </div>
              </div>
            )}
            {selectedMethod === 'mpesa' && (
              <div className="flex items-center gap-4">
                <div>
                  <img src="/mpesa.png" alt="M-Pesa" className="h-6 object-contain mb-0.5" />
                  <p className="text-[10px] text-gray-500">Scan QR, STK Push, or Till</p>
                </div>
              </div>
            )}
            {selectedMethod === 'card' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Card Payment</h3>
                  <p className="text-[10px] text-gray-500">Process via PDQ</p>
                </div>
              </div>
            )}
            {selectedMethod === 'bank' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Bank / Cheque</h3>
                  <p className="text-[10px] text-gray-500">Record external transfer</p>
                </div>
              </div>
            )}
            {selectedMethod === 'credit' && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Credit Sale</h3>
                  <p className="text-[10px] text-gray-500">Assign to customer</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            {selectedMethod === 'mpesa' && (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm animate-in fade-in"
              >
                <Search className="w-4 h-4" />
                Search Payment
              </button>
            )}
            <div className="text-right">
              <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Amount Due</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{formattedTotal}</p>
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

        {/* Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Payment Method Selector */}
          <div className="md:w-1/3 md:min-w-[280px] bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-6 overflow-x-auto md:overflow-y-auto shrink-0">
            <h3 className="hidden md:block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Methods</h3>
            <PaymentMethodSelector 
              selected={selectedMethod} 
              onSelect={setSelectedMethod} 
            />
            
            <div className="hidden md:block mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Keyboard Shortcuts</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex justify-between"><span>Cash</span> <kbd className="bg-gray-100 px-2 py-0.5 rounded border">F1</kbd></div>
                <div className="flex justify-between"><span>M-Pesa</span> <kbd className="bg-gray-100 px-2 py-0.5 rounded border">F2</kbd></div>
                <div className="flex justify-between"><span>Bank/Cheque</span> <kbd className="bg-gray-100 px-2 py-0.5 rounded border">F3</kbd></div>
                <div className="flex justify-between"><span>Card</span> <kbd className="bg-gray-100 px-2 py-0.5 rounded border">F4</kbd></div>
                <div className="flex justify-between"><span>Credit</span> <kbd className="bg-gray-100 px-2 py-0.5 rounded border">F5</kbd></div>
              </div>
            </div>
          </div>

          {/* Dynamic Payment Details */}
          <div className="flex-1 p-2 md:p-4 overflow-y-auto bg-white flex flex-col">
            {selectedMethod === 'cash' && <CashPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'mpesa' && <MpesaPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'card' && <CardPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'bank' && <BankChequePayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
            {selectedMethod === 'credit' && <CreditPayment totalAmount={totalAmount} formattedTotal={formattedTotal} />}
          </div>
          
        </div>
      </div>

      {isSearchOpen && (
        <SearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          targetAmount={totalAmount} 
        />
      )}
    </div>
  );
}
