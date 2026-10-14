import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { X, CreditCard, Smartphone, Wallet, CheckCircle, Loader2, CheckCircle2 } from 'lucide-react';
import CreditCustomerModal from './CreditCustomerModal';
import { soundManager } from '../lib/soundUtils';
import { useToast } from './ui/use-toast';
import { Modal } from './ui/modal';
import { Button } from './ui/button';

/**
 * Modal component for handling the checkout process.
 * Allows selecting payment method (Cash, M-Pesa, Credit) and completing the transaction.
 */
export default function CheckoutModal() {
  const { isCheckoutOpen, closeCheckout, cart, completeTransaction, businessSetup, isTransactionSuccessPopupOpen, lastCompletedTransaction, closeTransactionSuccessPopup } = usePosStore();

  // Flow state: 'select' -> 'details'
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'details'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'credit' | null>(null);

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

  // Reset state when opened/closed
  useEffect(() => {
    if (isCheckoutOpen) {
      setCheckoutStep('select');
      setPaymentMethod(null);
      setAmountTendered('');
      setMpesaCode('');
      setPhoneNumber('');
      setCreditCustomer('');
    }
  }, [isCheckoutOpen]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0; // Tax is set to 0 as per user instruction
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

  /**
   * Finalizes the transaction.
   * Validates credit customer selection if payment method is credit.
   */
  const handleComplete = async (overrideMpesaCode?: string | React.MouseEvent | any, overrideMpesaName?: string) => {
    const finalMpesaCode = typeof overrideMpesaCode === 'string' ? overrideMpesaCode : undefined;
    const finalMpesaName = typeof overrideMpesaName === 'string' ? overrideMpesaName : undefined;
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

  /**
   * Callback when a customer is selected from the CreditCustomerModal.
   * @param customerName - The name of the selected customer.
   */
  const handleSelectCustomer = (customerName: string) => {
    setCreditCustomer(customerName);
    setIsCreditModalOpen(false);
  };

  /**
   * Updates the selected payment method.
   * Opens the credit customer selection modal if 'credit' is chosen.
   */
  const handlePaymentMethodChange = (method: 'cash' | 'mpesa' | 'credit') => {
    soundManager.playPop();
    setPaymentMethod(method);
    setCheckoutStep('details');
    if (method === 'credit') {
      setIsCreditModalOpen(true);
    }
  };

  const handleBackToSelect = () => {
    setCheckoutStep('select');
    setPaymentMethod(null);
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
      const maxAttempts = 15; // 45 seconds polling

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

  /**
   * Reusable button component for payment methods.
   */
  const PaymentButton = ({ method, current, setMethod, icon, label }: any) => {
    const isSelected = method === current;
    return (
        <button
          onClick={() => handlePaymentMethodChange(method)}
          className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${
            isSelected
              ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {icon}
          <span className="font-semibold text-sm mt-2">{label}</span>
          {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
        </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">Checkout</h2>
            <button
              onClick={closeCheckout}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {checkoutStep === 'select' ? (
            <div className="p-6">
              <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between text-md">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">KES {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-md">
                  <span className="text-gray-600">VAT (0%)</span>
                  <span className="font-medium">KES {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-gray-800 pt-3 border-t-2 border-dashed">
                  <span>Total</span>
                  <span className="text-blue-600">KES {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 mb-2 text-md">Select Payment Method</h3>
                <div className="grid grid-cols-3 gap-3">
                  <PaymentButton
                      method="cash"
                      current={paymentMethod}
                      setMethod={setPaymentMethod}
                      icon={<Wallet className="w-6 h-6 text-green-500" />}
                      label="Cash"
                  />

                  <PaymentButton
                      method="mpesa"
                      current={paymentMethod}
                      setMethod={setPaymentMethod}
                      icon={<Smartphone className="w-6 h-6 text-blue-500" />}
                      label="M-Pesa"
                  />

                  <PaymentButton
                      method="credit"
                      current={paymentMethod}
                      setMethod={setPaymentMethod}
                      icon={<CreditCard className="w-6 h-6 text-orange-500" />}
                      label="Credit"
                  />
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={closeCheckout}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 animate-in fade-in slide-in-from-right-4">
               {/* Detail View Header */}
               <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                  <button onClick={handleBackToSelect} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600 rotate-45" /> {/* Makes it look like a back button using X temporarily, ideally use ArrowLeft */}
                  </button>
                  <h3 className="text-xl font-bold text-gray-800 capitalize">{paymentMethod} Payment</h3>
                  <div className="ml-auto text-xl font-bold text-blue-600">KES {total.toFixed(2)}</div>
               </div>

                {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount Tendered (Optional)
                            </label>
                            <input
                                type="number"
                                value={amountTendered}
                                onChange={(e) => setAmountTendered(e.target.value)}
                                placeholder={`e.g. ${total}`}
                                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-bold"
                            />
                        </div>
                        {amountTendered !== '' && tendered >= total && (
                            <div className="flex justify-between items-center text-xl font-bold text-green-700 bg-green-50 p-4 rounded-xl border border-green-200">
                                <span>Change to return:</span>
                                <span>KES {change.toFixed(2)}</span>
                            </div>
                        )}
                        {amountTendered !== '' && tendered < total && (
                            <div className="flex justify-between items-center text-md font-bold text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
                                <span>Insufficient amount</span>
                                <span>Needs KES {(total - tendered).toFixed(2)} more</span>
                            </div>
                        )}
                    </div>
                )}

                {paymentMethod === 'mpesa' && (
                    <div className="space-y-4">
                        {businessSetup?.mpesaConfig?.enabled ? (
                            <>
                                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                    <button
                                        onClick={() => setMpesaVerificationMode('manual')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${mpesaVerificationMode === 'manual' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Enter Manual Code
                                    </button>
                                    <button
                                        onClick={() => setMpesaVerificationMode('auto')}
                                        className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${mpesaVerificationMode === 'auto' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Send Prompt to Phone
                                    </button>
                                </div>

                                {mpesaVerificationMode === 'manual' ? (
                                    <div className="space-y-3 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                M-Pesa Confirmation Code
                                            </label>
                                            <input
                                                type="text"
                                                value={mpesaCode}
                                                onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                                                placeholder="e.g. QWE123RTY"
                                                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono text-xl tracking-widest text-center"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Customer Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="07XX XXX XXX or 01XX XXX XXX"
                                                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xl text-center tracking-wider"
                                            />
                                        </div>
                                        <button
                                            className={`w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-md ${isStkPushing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}
                                            onClick={handleStkPush}
                                            disabled={isStkPushing}
                                        >
                                            {isStkPushing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Smartphone className="w-6 h-6" />}
                                            {isStkPushing ? 'Waiting for PIN & Processing...' : 'Send Payment Prompt'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-gray-800 mb-2">Manual M-Pesa Payment</h4>
                                <p className="text-gray-600">
                                    M-Pesa automation is currently disabled. Please ask the customer to pay via M-Pesa manually. Click <strong>Complete Payment</strong> below once confirmed.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {paymentMethod === 'credit' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Customer Account
                    </label>
                    <button
                      onClick={() => setIsCreditModalOpen(true)}
                      className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-left text-lg font-medium hover:bg-gray-50 transition-colors flex justify-between items-center"
                    >
                      {creditCustomer || <span className="text-gray-400">Click to select customer...</span>}
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                )}

                <div className="flex gap-4 mt-8 pt-6 border-t">
                  <button
                    onClick={handleBackToSelect}
                    className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={
                      isCompleting ||
                      (paymentMethod === 'cash' && amountTendered !== '' && tendered < total) ||
                      (paymentMethod === 'mpesa' && businessSetup?.mpesaConfig?.enabled && mpesaVerificationMode === 'manual' && mpesaCode.length < 5) ||
                      (paymentMethod === 'credit' && !creditCustomer)
                    }
                    className="flex-[2] px-6 py-4 bg-green-500 text-white font-bold text-lg rounded-xl hover:bg-green-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isCompleting && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isCompleting ? 'Processing...' : 'Complete Payment'}
                  </button>
                </div>
            </div>
          )}
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
