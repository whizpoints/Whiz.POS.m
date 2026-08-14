import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Minus, Plus, Trash2, Split, CreditCard, Wallet, Smartphone, User, ShoppingCartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming shadcn button is available or standard button
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
// Since shadcn components are not strictly set up in the provided file list, I'll use standard Tailwind classes with the requested "friendly" look.

export default function OrderArea() {
  const { cart, removeFromCart, updateQuantity, clearCart, openCheckout, completeTransaction } = usePosStore();
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  
  useKeyboardShortcuts();

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = 0;
  const total = subtotal + tax;

  const handleSplitBill = () => {
      setShowSplitBill(true);
  };

  const splitAmount = total / splitCount;

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800">Current Order</h2>
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
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCartIcon className="w-8 h-8" />
            </div>
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm">Select products to start an order</p>
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

        <div className="grid grid-cols-2 gap-3">
            {/* Split Bill Button */}
            <button
                onClick={() => setShowSplitBill(!showSplitBill)}
                disabled={cart.length === 0}
                className={`col-span-2 py-2.5 rounded-xl font-semibold text-sm transition-colors border flex items-center justify-center gap-2 ${
                    showSplitBill
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
                <Split className="w-4 h-4" />
                {showSplitBill ? 'Cancel Split' : 'Split Bill'}
            </button>

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

            <button
                onClick={openCheckout}
                disabled={cart.length === 0}
                className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Checkout <span className="bg-white/20 px-2 py-0.5 rounded text-sm">KES {total.toFixed(2)} [Space/F12]</span>
            </button>
        </div>
      </div>
    </div>
  );
}

