import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store/posStore';
import { Banknote, CheckCircle2, Delete } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface Props {
  totalAmount: number;
  formattedTotal: string;
}

export default function CashPayment({ totalAmount, formattedTotal }: Props) {
  const [tendered, setTendered] = useState<string>('');
  const { completeTransaction } = usePosStore();
  const { toast } = useToast();

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setTendered('');
    } else if (val === 'DEL') {
      setTendered(prev => prev.slice(0, -1));
    } else {
      setTendered(prev => prev + val);
    }
  };

  const handleQuickAmount = (val: number) => {
    setTendered(val.toString());
  };

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - totalAmount;
  const isSufficient = tenderedNum >= totalAmount;

  const handleComplete = () => {
    if (!isSufficient) {
      toast('Amount tendered is less than the total due.', 'error');
      return;
    }
    
    // Call POS store completeTransaction for cash
    completeTransaction('cash', undefined, { amountTendered: tenderedNum, change });
  };

  // Keyboard support for typing amount directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if they are inside an input (though there are none here, good practice)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadPress('DEL');
      } else if (e.key === 'Enter') {
        if (tenderedNum >= totalAmount) {
          handleComplete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tenderedNum, totalAmount]);

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto mt-4">
      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center border border-gray-100 shadow-inner flex flex-col items-center">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount Received</p>
        <div className="flex items-center justify-center text-5xl font-bold text-gray-900 tracking-tight mb-2">
          <span className="text-3xl text-gray-400 mr-2">KSh</span>
          <input 
            type="number"
            autoFocus
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isSufficient) {
                handleComplete();
              }
            }}
            className="w-48 bg-transparent border-b-2 border-dashed border-gray-300 focus:border-emerald-500 text-center outline-none"
            placeholder="0"
          />
        </div>
        
        {tenderedNum > 0 && (
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            isSufficient ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            Change: {isSufficient ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(change).replace('KES', 'KSh') : 'Insufficient'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <button onClick={() => handleQuickAmount(totalAmount)} className="col-span-1 py-6 text-lg bg-emerald-50 text-emerald-700 font-bold rounded-2xl border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition-colors">EXACT</button>
        <button onClick={() => handleQuickAmount(Math.ceil(totalAmount / 500) * 500)} className="col-span-1 py-6 text-lg bg-gray-50 text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">+{Math.ceil(totalAmount / 500) * 500}</button>
        <button onClick={() => handleQuickAmount(Math.ceil(totalAmount / 1000) * 1000)} className="col-span-1 py-6 text-lg bg-gray-50 text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">+{Math.ceil(totalAmount / 1000) * 1000}</button>
        <button onClick={() => handleQuickAmount(Math.ceil(totalAmount / 1000) * 1000 + 1000)} className="col-span-1 py-6 text-lg bg-gray-50 text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">+{Math.ceil(totalAmount / 1000) * 1000 + 1000}</button>

        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
          <button
            key={key}
            onClick={() => handleKeypadPress(key)}
            className={`py-8 text-4xl font-bold rounded-2xl border shadow-sm transition-colors ${
              key === 'C' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' :
              key === 'DEL' ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 flex items-center justify-center' :
              'bg-white text-gray-900 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {key === 'DEL' ? <Delete className="w-10 h-10" /> : key}
          </button>
        ))}
      </div>

      <button
        onClick={handleComplete}
        disabled={!isSufficient}
        className={`mt-auto w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all ${
          isSufficient
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <CheckCircle2 className="w-6 h-6" />
        CONFIRM PAYMENT
      </button>
    </div>
  );
}
