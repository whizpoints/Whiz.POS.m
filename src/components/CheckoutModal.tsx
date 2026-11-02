import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { X, CreditCard, Smartphone, Wallet, CheckCircle, Loader2, CheckCircle2, ShoppingBag, ArrowLeft } from 'lucide-react';
import CreditCustomerModal from './CreditCustomerModal';
import { soundManager } from '../lib/soundUtils';
import { useToast } from './ui/use-toast';

/**
 * Modern Wide-Split Modal for handling checkout and payment settlement.
 * Left Side: Itemized order list, table/tab ref, subtotals and grand total.
 * Right Side: Payment method tabs (Cash, M-Pesa, Credit), quick amount buttons, STK push & finalize action.
 */
export default function CheckoutModal() {
  const { 
    isCheckoutOpen, 
    closeCheckout, 
    cart, 
    completeTransaction, 
    businessSetup, 
    activeSettlingBillId,
    cancelSettlingBill,
    openBills 
  } = usePosStore();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'credit'>('cash');
  const [creditCustomer, setCreditCustomer] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [isStkPushing, setIsStkPushing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  // M-Pesa specific state
  const [mpesaCode, setMpesaCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mpesaVerificationMode, setMpesaVerificationMode] = useState<'manual' | 'auto'>('manual');

  // Find active bill if settling an open tab
  const activeBill = activeSettlingBillId 
    ? (openBills || []).find(b => b.id === activeSettlingBillId) 
    : null;

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0; // Tax is 0% as per store configuration
  const total = subtotal + tax;

  // Calculate change
  const tendered = parseFloat(amountTendered) || 0;
  const change = Math.max(0, tendered - total);

  // Reset state when modal opens
  useEffect(() => {
    if (isCheckoutOpen) {
      setAmountTendered('');
      setPaymentMethod('cash');
      setCreditCustomer('');
      setMpesaCode('');
      setPhoneNumber('');
      setMpesaVerificationMode('manual');
    }
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const handleClose = () => {
    if (activeSettlingBillId) {
      cancelSettlingBill();
    } else {
      closeCheckout();
    }
  };

  /**
   * Finalizes the transaction.
   * Validates credit customer selection if payment method is credit.
   */
  const handleComplete = async (overrideMpesaCode?: string | React.MouseEvent | any, overrideMpesaName?: string) => {
    const finalMpesaCode = typeof overrideMpesaCode === 'string' ? overrideMpesaCode : undefined;
    const finalMpesaName = typeof overrideMpesaName === 'string' ? overrideMpesaName : undefined;
    if (!paymentMethod) return;
    
    if (paymentMethod === 'credit' && !creditCustomer.trim()) {
      soundManager.playError();
      alert('Please select a customer for credit payment');
      return;
    }
    if (paymentMethod === 'cash' && tendered < total && amountTendered !== '') {
      soundManager.playError();
      alert('Amount tendered is less than the total.');
      return;
    }

    setIsCompleting(true);
    let additionalData: any = {};
    if (paymentMethod === 'cash' && amountTendered !== '') {
      additionalData.amountTendered = tendered;
      additionalData.change = change;
    }
    if (paymentMethod === 'mpesa') {
      if (finalMpesaCode || mpesaCode) additionalData.mpesaCode = finalMpesaCode || mpesaCode;
      if (phoneNumber) additionalData.phoneNumber = phoneNumber;
      if (finalMpesaName) additionalData.mpesaName = finalMpesaName;
    }

    try {
      await completeTransaction(
        paymentMethod,
        paymentMethod === 'credit' ? creditCustomer : undefined,
        additionalData
      );
      soundManager.playCheckout();
    } catch (err: any) {
      toast("Checkout Failed: " + err.message, "error");
      soundManager.playError();
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSelectCustomer = (customerName: string) => {
    setCreditCustomer(customerName);
    setIsCreditModalOpen(false);
  };

  const handlePaymentMethodChange = (method: 'cash' | 'mpesa' | 'credit') => {
    soundManager.playPop();
    setPaymentMethod(method);
    if (method === 'credit') {
      setIsCreditModalOpen(true);
    }
  };

  const handleStkPush = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast("Please enter a valid phone number (e.g. 254712345678 or 0712345678)", "error");
      return;
    }

    const config = businessSetup?.mpesaConfig;
    if (!config?.backendUrl || !config?.apiKey) {
      toast("M-Pesa backend URL or API Key is not configured in Developer settings.", "error");
      return;
    }

    setIsStkPushing(true);
    soundManager.playClick();

    try {
      toast("Initiating STK Push via backend...", "info");

      const payload = {
        phoneNumber,
        amount: total,
        accountReference: 'POS-Checkout',
        transactionDesc: 'Payment for items'
      };

      const backendUrl = config.backendUrl.replace(/\/$/, '');
      const response = await fetch(`${backendUrl}/api/mpesa/stkpush`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to initiate STK Push on backend');
      }

      const responseData = await response.json();
      const checkoutRequestID = responseData.CheckoutRequestID || responseData.data?.CheckoutRequestID;

      if (!checkoutRequestID) {
        toast("Prompt sent, but missing request ID for tracking.", "info");
        return;
      }

      toast(`Waiting for user ${phoneNumber} to enter PIN...`, "info");

      let attempts = 0;
      let isSuccess = false;
      let finalCode = "";
      let finalName = "";
      const maxAttempts = 15;

      while (attempts < maxAttempts && !isSuccess) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;

        try {
          const checkResponse = await fetch(`${backendUrl}/api/mpesa/status/${checkoutRequestID}`, {
            headers: {
              'x-api-key': config.apiKey,
              'Authorization': `Bearer ${config.apiKey}`
            }
          });

          if (checkResponse.ok) {
            const statusData = await checkResponse.json();
            if (statusData.status === 'completed' || statusData.status === 'Success' || statusData.ResultCode === 0) {
              isSuccess = true;
              finalCode = statusData.receiptNumber || statusData.MpesaReceiptNumber || "AUTO-CONFIRMED";
              finalName = statusData.customerName || statusData.CustomerName || statusData.MpesaCustomerName || statusData.name || statusData.receiptName || statusData.senderName;
              setMpesaCode(finalCode);
            } else if (statusData.status === 'failed' || (statusData.ResultCode !== undefined && statusData.ResultCode !== 0)) {
              throw new Error(statusData.ResultDesc || 'Transaction failed or was cancelled by user.');
            }
          }
        } catch (pollErr: any) {
          console.log("Polling... ", pollErr.message);
        }
      }

      if (isSuccess) {
        soundManager.playCheckout();
        toast("Payment Received Successfully!", "info");
        handleComplete(finalCode, finalName);
      } else {
        throw new Error("Transaction timed out waiting for confirmation.");
      }

    } catch (e: any) {
      toast(e.message || "Failed to process STK Push", "error");
      soundManager.playError();
    } finally {
      setIsStkPushing(false);
    }
  };

  // Quick cash amount helper buttons
  const quickCashOptions = [
    { label: 'Exact', value: total },
    { label: 'KES 500', value: 500 },
    { label: 'KES 1,000', value: 1000 },
    { label: 'KES 2,000', value: 2000 },
    { label: 'KES 5,000', value: 5000 },
  ].filter(opt => opt.value >= total || opt.label === 'Exact');

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
          
          {/* Top Modal Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Checkout & Payment Settlement
                  {activeBill && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      ☕ Table {activeBill.tableNumber || 'Tab'} ({activeBill.customerName || 'Guest'})
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {cart.length} item{cart.length > 1 ? 's' : ''} in transaction • Grand Total: <span className="font-bold text-slate-800">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
              title="Close Checkout"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body: Split View Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-0">
            
            {/* Left Column: Order Items & Order Summary (5 cols) */}
            <div className="md:col-span-5 bg-slate-50/80 p-6 border-r border-slate-200/80 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Items Being Paid For</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{cart.length} distinct</span>
                </div>

                {/* Scrollable Items List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {cart.map((item, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-sm text-slate-900 truncate">{item.product.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.quantity} × KES {item.product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                        KES {(item.product.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Totals Box */}
              <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">KES {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>VAT / Taxes (0%)</span>
                  <span className="font-mono font-medium">KES {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-dashed border-slate-300">
                  <span className="text-base font-bold text-slate-900">Total Payable</span>
                  <span className="text-2xl font-black text-blue-600 font-mono tracking-tight">
                    KES {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Settlement Execution (7 cols) */}
            <div className="md:col-span-7 p-6 flex flex-col justify-between overflow-y-auto bg-white">
              <div className="space-y-5">
                
                {/* Payment Method Selector Tabs */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('cash')}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-150 ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                      }`}
                    >
                      <Wallet className={`w-6 h-6 mb-1.5 ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-sm">Cash</span>
                      {paymentMethod === 'cash' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute top-2 right-2" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('mpesa')}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-150 ${
                        paymentMethod === 'mpesa'
                          ? 'border-blue-500 bg-blue-50/80 text-blue-900 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                      }`}
                    >
                      <Smartphone className={`w-6 h-6 mb-1.5 ${paymentMethod === 'mpesa' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-sm">M-Pesa</span>
                      {paymentMethod === 'mpesa' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-2 right-2" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('credit')}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-150 ${
                        paymentMethod === 'credit'
                          ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-md ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mb-1.5 ${paymentMethod === 'credit' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-sm">Store Credit</span>
                      {paymentMethod === 'credit' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 absolute top-2 right-2" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CASH SECTION */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-4 pt-1 animate-in fade-in">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Amount Tendered
                        </label>
                        {amountTendered && (
                          <button
                            type="button"
                            onClick={() => setAmountTendered('')}
                            className="text-xs text-blue-600 hover:underline font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        placeholder={`e.g. ${total}`}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-2xl font-black font-mono tracking-tight text-slate-900"
                      />
                    </div>

                    {/* Quick Amount Suggestion Buttons */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Quick Tender Amounts:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {quickCashOptions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAmountTendered(String(opt.value))}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors bg-slate-50 font-mono text-slate-700"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Change Display */}
                    {amountTendered !== '' && tendered >= total && (
                      <div className="flex justify-between items-center text-lg font-bold text-emerald-800 bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm animate-in zoom-in-95">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" /> Change to Return:
                        </span>
                        <span className="font-mono text-2xl font-black">KES {change.toFixed(2)}</span>
                      </div>
                    )}

                    {amountTendered !== '' && tendered < total && (
                      <div className="flex justify-between items-center text-sm font-bold text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                        <span>Insufficient Tender</span>
                        <span>Needs KES {(total - tendered).toFixed(2)} more</span>
                      </div>
                    )}
                  </div>
                )}

                {/* M-PESA SECTION */}
                {paymentMethod === 'mpesa' && (
                  <div className="space-y-4 pt-1 animate-in fade-in">
                    {businessSetup?.mpesaConfig?.enabled ? (
                      <>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setMpesaVerificationMode('manual')}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                              mpesaVerificationMode === 'manual' 
                                ? 'bg-white text-blue-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Enter Manual Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setMpesaVerificationMode('auto')}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                              mpesaVerificationMode === 'auto' 
                                ? 'bg-white text-blue-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Send Prompt to Phone (STK)
                          </button>
                        </div>

                        {mpesaVerificationMode === 'manual' ? (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                              M-Pesa Confirmation Code <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={mpesaCode}
                              onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                              placeholder="e.g. QWE123RTY"
                              className="w-full p-3.5 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none uppercase font-mono text-xl tracking-widest text-center font-bold"
                            />
                            <p className="text-[11px] text-slate-400 text-center">
                              Enter the 10-character transaction reference received via SMS
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Customer Phone Number
                              </label>
                              <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="07XX XXX XXX or 2547XX XXX XXX"
                                className="w-full p-3.5 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-xl text-center font-mono font-bold tracking-wider"
                              />
                            </div>
                            <button
                              type="button"
                              className={`w-full py-3.5 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2.5 text-base shadow-md ${
                                isStkPushing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                              }`}
                              onClick={handleStkPush}
                              disabled={isStkPushing}
                            >
                              {isStkPushing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                              {isStkPushing ? 'Waiting for PIN on Phone...' : `Send STK Prompt (KES ${total})`}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-200">
                        <Smartphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-800 mb-1">Direct M-Pesa Payment</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">
                          Customer pays via Till/Paybill. Once received, optionally enter code below or click Complete Payment.
                        </p>
                        <input
                          type="text"
                          value={mpesaCode}
                          onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                          placeholder="M-Pesa Reference (Optional)"
                          className="w-full p-3 border border-slate-300 rounded-xl uppercase font-mono text-center text-sm font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* STORE CREDIT SECTION */}
                {paymentMethod === 'credit' && (
                  <div className="space-y-3 pt-1 animate-in fade-in">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Select Customer Account
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreditModalOpen(true)}
                      className="w-full px-4 py-4 border-2 border-slate-200 hover:border-amber-500 rounded-2xl text-left text-base font-semibold hover:bg-amber-50/50 transition-colors flex justify-between items-center group"
                    >
                      {creditCustomer ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-xs">
                            {creditCustomer.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-slate-900 font-bold">{creditCustomer}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">Click to search and select customer account...</span>
                      )}
                      <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </button>
                  </div>
                )}

              </div>

              {/* Bottom Action Buttons */}
              <div className="flex gap-3 mt-8 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-5 py-4 border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={
                    isCompleting ||
                    (paymentMethod === 'cash' && amountTendered !== '' && tendered < total) ||
                    (paymentMethod === 'mpesa' && businessSetup?.mpesaConfig?.enabled && mpesaVerificationMode === 'manual' && mpesaCode.length < 5) ||
                    (paymentMethod === 'credit' && !creditCustomer)
                  }
                  className="flex-[2] px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isCompleting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isCompleting 
                    ? 'Finalizing Transaction...' 
                    : `Complete & Settle (KES ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                  }
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <CreditCustomerModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />
    </>
  );
}
