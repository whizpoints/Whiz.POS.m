import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePosStore } from '../store/posStore';
import { Minus, Plus, Trash2, Split, CreditCard, Wallet, Smartphone, User, ShoppingCartIcon, Receipt, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming shadcn button is available or standard button
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
// Since shadcn components are not strictly set up in the provided file list, I'll use standard Tailwind classes with the requested "friendly" look.

export default function OrderArea() {
  const navigate = useNavigate();
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    openCheckout, 
    completeTransaction,
    businessSetup,
    openBills,
    openOpenBillsModal,
    issueCustomerBill,
    isBillPromptOpen,
    openBillPrompt,
    closeBillPrompt
  } = usePosStore();

  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [billTable, setBillTable] = useState('');
  const [billGuest, setBillGuest] = useState('');
  const [isIssuingBill, setIsIssuingBill] = useState(false);
  
  useKeyboardShortcuts();

  const isBillMode = businessSetup?.billModeEnabled || false;

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = 0;
  const total = subtotal + tax;

  const handleSplitBill = () => {
      setShowSplitBill(true);
  };

  const handleIssueBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuingBill(true);
    try {
      await issueCustomerBill({
        tableNumber: billTable.trim(),
        customerName: billGuest.trim() || undefined
      });
      closeBillPrompt();
      setBillTable('');
      setBillGuest('');
    } catch (err: any) {
      alert(`Failed to issue bill: ${err.message}`);
    } finally {
      setIsIssuingBill(false);
    }
  };

  const splitAmount = total / splitCount;

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col border border-gray-100 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">Current Order</h2>
          {openBills && openBills.length > 0 && (
            <button
              onClick={() => navigate('/open-bills')}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              title="View all open customer tabs"
            >
              <UtensilsCrossed className="w-3 h-3" />
              {openBills.length} Open Tabs
            </button>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 text-sm font-medium px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
          >
            Clear [F8]
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCartIcon className="w-7 h-7 opacity-30" />
            </div>
            <p className="font-bold text-sm text-gray-600">Cart is empty</p>
            {isBillMode && openBills && openBills.length > 0 && (
              <button
                onClick={() => navigate('/open-bills')}
                className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-100 transition-colors"
              >
                View {openBills.length} Pending Bills / Tabs &rarr;
              </button>
            )}
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className="group flex items-center gap-3 bg-white border border-gray-100 hover:border-blue-200 rounded-xl p-3 shadow-sm transition-all hover:shadow-md">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{item.product.name}</h4>
                <p className="text-sm text-blue-600 font-medium">KES {item.product.price}</p>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-md bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center shadow-sm border border-gray-200 transition-all active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>
                
                <span className="w-6 text-center font-bold text-gray-700 text-sm">{item.quantity}</span>
                
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-md bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center shadow-sm border border-gray-200 transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Area */}
      <div className="p-5 bg-gray-50 border-t border-gray-100">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>KES {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax (0%)</span>
            <span>KES {tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-blue-600">KES {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            {/* Split Bill Button */}
            <button
                onClick={() => setShowSplitBill(!showSplitBill)}
                disabled={cart.length === 0}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    showSplitBill
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
                <Split className="w-3.5 h-3.5" />
                {showSplitBill ? 'Cancel Split' : 'Split Bill'}
            </button>

            {isBillMode && (
              <button
                onClick={() => navigate('/open-bills')}
                className="py-2 px-3 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Open Tabs ({openBills?.length || 0})
              </button>
            )}

            {/* Split Bill Interface */}
            {showSplitBill && (
                <div className="col-span-2 bg-white p-3 rounded-xl border border-purple-100 mb-2 shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Split into</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center font-bold">-</button>
                            <span className="font-bold text-purple-700">{splitCount}</span>
                            <button onClick={() => setSplitCount(splitCount + 1)} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center font-bold">+</button>
                        </div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 uppercase font-bold">Each Pays</p>
                        <p className="text-lg font-bold text-purple-800">KES {splitAmount.toFixed(2)}</p>
                    </div>
                </div>
            )}

            {isBillMode ? (
              <button
                  onClick={openBillPrompt}
                  disabled={cart.length === 0}
                  className="col-span-2 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3.5 rounded-xl font-black shadow-lg shadow-amber-200 hover:shadow-amber-300 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
              >
                  <Receipt className="w-5 h-5" />
                  <span>Issue Customer Bill (Open Tab)</span>
                  <span className="bg-black/15 px-2.5 py-1 rounded-lg text-sm font-black">KES {total.toFixed(2)} [Space/F12]</span>
              </button>
            ) : (
              <button
                  onClick={openCheckout}
                  disabled={cart.length === 0}
                  className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                  <CreditCard className="w-5 h-5" />
                  <span>Checkout</span>
                  <span className="bg-white/20 px-2.5 py-1 rounded-lg text-sm font-bold">KES {total.toFixed(2)} [Space/F12]</span>
              </button>
            )}
        </div>
      </div>

      {/* Large Bill Issue Modal Prompt */}
      {isBillPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-amber-500 p-4 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-base">
                <Receipt className="w-5 h-5" />
                ISSUE CUSTOMER BILL (OPEN TAB)
              </div>
              <button onClick={closeBillPrompt} className="text-slate-950/70 hover:text-slate-950 font-bold text-xl px-2">
                &times;
              </button>
            </div>
            <form onSubmit={handleIssueBillSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left column: Tab / Customer details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                      Table Number / Tab Reference <span className="text-gray-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input 
                      autoFocus
                      type="text"
                      value={billTable}
                      onChange={e => setBillTable(e.target.value)}
                      placeholder="e.g. Table 4, Bar 2, or leave blank"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">If left blank, will auto-assign Tab #{Date.now().toString().slice(-4)}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                      Customer / Guest Name <span className="text-gray-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input 
                      type="text"
                      value={billGuest}
                      onChange={e => setBillGuest(e.target.value)}
                      placeholder="e.g. John Doe, VIP Guest"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                    />
                  </div>

                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      Hospitality Open Tab
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Orders stay open in the <b>Active Open Tabs</b> page. You can settle payment at any time via M-Pesa, Cash, or Card.
                    </p>
                  </div>
                </div>

                {/* Right column: Items & Total preview */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                      <span>Order Items</span>
                      <span className="font-semibold text-slate-700">{cart.length} items</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-100">
                          <div className="flex-1 truncate pr-2">
                            <span className="font-black text-amber-700 mr-1.5">{item.quantity}x</span>
                            <span className="font-medium text-slate-800">{item.product.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-700">
                            KES {(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Subtotal</span>
                      <span>KES {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-sm font-bold text-slate-700">TOTAL DUE:</span>
                      <span className="text-xl font-black text-amber-600">KES {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeBillPrompt}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIssuingBill}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black rounded-xl shadow-lg shadow-amber-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  {isIssuingBill ? 'Processing...' : 'ISSUE BILL & OPEN TAB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

