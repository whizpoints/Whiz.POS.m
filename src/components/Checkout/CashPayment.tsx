import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store/posStore';
import { Banknote, CheckCircle2, Delete, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface Props {
  totalAmount: number;
  remainingAmount?: number;
  formattedTotal: string;
  onAddSplit?: (tender: any) => void;
  isSplitActive?: boolean;
}

export default function CashPayment({ totalAmount, remainingAmount, formattedTotal, onAddSplit, isSplitActive }: Props) {
  const targetAmount = (remainingAmount !== undefined && remainingAmount >= 0) ? remainingAmount : totalAmount;
  const [tendered, setTendered] = useState<string>('');
  const { completeTransaction } = usePosStore();
  const { toast } = useToast();

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setTendered('');
    } else if (val === 'DEL') {
      setTendered(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!tendered.includes('.')) {
        setTendered(prev => (prev === '' ? '0.' : prev + '.'));
      }
    } else {
      // Prevent multiple leading zeroes
      if (tendered === '0' && val !== '.') {
        setTendered(val);
      } else {
        setTendered(prev => prev + val);
      }
    }
  };

  const handleQuickAdd = (addVal: number) => {
    const current = parseFloat(tendered) || 0;
    const nextVal = current === 0 ? addVal : current + addVal;
    setTendered(nextVal.toString());
  };

  const handleSetExact = () => {
    setTendered(targetAmount.toString());
  };

  const tenderedNum = parseFloat(tendered) || 0;
  const change = Math.max(0, tenderedNum - targetAmount);
  const remaining = Math.max(0, targetAmount - tenderedNum);
  const isSufficient = tenderedNum >= targetAmount && targetAmount > 0;
  const canAddToSplit = onAddSplit && tenderedNum > 0;

  const handleComplete = () => {
    if (onAddSplit && isSplitActive) {
      onAddSplit({
        method: 'cash',
        amount: Math.min(tenderedNum, targetAmount),
        change: change > 0 ? change : 0
      });
      setTendered('');
      return;
    }

    if (!isSufficient) {
      toast('Amount tendered is less than the total due.', 'error');
      return;
    }
    
    completeTransaction('cash', undefined, { amountTendered: tenderedNum, change });
  };

  const handleAddPartialSplit = () => {
    if (!onAddSplit || tenderedNum <= 0) return;
    onAddSplit({
      method: 'cash',
      amount: Math.min(tenderedNum, targetAmount),
      change: change > 0 ? change : 0
    });
    setTendered('');
  };

  // Keyboard support for typing amount directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === '.') {
        handleKeypadPress('.');
      } else if (e.key === 'Backspace') {
        handleKeypadPress('DEL');
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleKeypadPress('C');
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
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto py-1 px-2 md:px-4 justify-between">
      {/* Top Section: Amount Display & Calculation */}
      <div className="w-full">
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 md:p-3.5 mb-2.5 shadow-inner flex flex-col items-center justify-center relative">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Received</span>
          </div>

          <div className="flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight my-0.5">
            <span className="text-2xl sm:text-3xl font-semibold text-slate-400 mr-2 select-none">KSh</span>
            <input 
              type="number"
              step="any"
              autoFocus
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isSufficient) {
                  handleComplete();
                }
              }}
              className="w-48 sm:w-60 bg-transparent border-b-2 border-dashed border-slate-300 focus:border-emerald-500 text-center font-black outline-none tracking-tight text-slate-900"
              placeholder="0"
            />
          </div>

          {/* Dynamic Change or Balance Pill */}
          <div className="min-h-[28px] flex items-center justify-center mt-1">
            {tenderedNum > 0 && isSufficient && (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-base sm:text-lg font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs animate-in zoom-in-95">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>CHANGE: KSh {change.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {tenderedNum > 0 && !isSufficient && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm sm:text-base font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span>Remaining: KSh {remaining.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {tenderedNum === 0 && (
              <span className="text-xs text-slate-400 font-medium">
                Tap exact, add preset denominations, or type amount below
              </span>
            )}
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 mb-2.5">
          <button 
            type="button"
            onClick={handleSetExact}
            className="py-2 px-1 text-xs sm:text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-extrabold rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center cursor-pointer"
          >
            EXACT
          </button>
          <button 
            type="button"
            onClick={() => handleQuickAdd(100)}
            className="py-2 px-1 text-xs sm:text-sm bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-extrabold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            +100
          </button>
          <button 
            type="button"
            onClick={() => handleQuickAdd(200)}
            className="py-2 px-1 text-xs sm:text-sm bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-extrabold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            +200
          </button>
          <button 
            type="button"
            onClick={() => handleQuickAdd(500)}
            className="py-2 px-1 text-xs sm:text-sm bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-extrabold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            +500
          </button>
          <button 
            type="button"
            onClick={() => handleQuickAdd(1000)}
            className="py-2 px-1 text-xs sm:text-sm bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-extrabold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            +1,000
          </button>
        </div>

        {/* Large 3-Column Touch Keypad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadPress(digit)}
              className="h-11 sm:h-12 md:h-13 text-xl sm:text-2xl font-black rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center select-none cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Bottom Keypad Row: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={() => handleKeypadPress('C')}
            className="h-11 sm:h-12 md:h-13 text-lg sm:text-xl font-black rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center select-none cursor-pointer"
          >
            C
          </button>

          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-11 sm:h-12 md:h-13 text-xl sm:text-2xl font-black rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center select-none cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => handleKeypadPress('DEL')}
            className="h-11 sm:h-12 md:h-13 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-300 shadow-2xs transition-all active:scale-95 flex items-center justify-center select-none cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Confirm Payment Button or Split Add */}
      <div className="space-y-2">
        {onAddSplit && tenderedNum > 0 && !isSufficient && (
          <button
            type="button"
            onClick={handleAddPartialSplit}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>+ Add KSh {tenderedNum.toFixed(2)} to Split Bill</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={!isSufficient && !(onAddSplit && isSplitActive && tenderedNum > 0)}
          className={`w-full py-3.5 sm:py-4 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all uppercase tracking-wide shadow-md ${
            isSufficient || (isSplitActive && tenderedNum > 0)
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer active:scale-[0.99]'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
          <span>{isSplitActive ? 'ADD CASH TO SPLIT' : 'CONFIRM PAYMENT'}</span>
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
}
