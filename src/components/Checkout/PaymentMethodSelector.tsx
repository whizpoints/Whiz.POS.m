import React from 'react';
import { Banknote, Smartphone, Landmark, CreditCard, UserCheck } from 'lucide-react';
import { PaymentMethodType } from './CheckoutModal';

interface Props {
  selected: PaymentMethodType;
  onSelect: (method: PaymentMethodType) => void;
}

export default function PaymentMethodSelector({ selected, onSelect }: Props) {
  const methods = [
    { id: 'cash', label: 'CASH', icon: <Banknote className="w-5 h-5" />, color: 'bg-emerald-500', activeClass: 'border-emerald-500 bg-emerald-50/50 text-emerald-900' },
    { id: 'mpesa', label: 'M-PESA', icon: <Smartphone className="w-5 h-5" />, color: 'bg-green-500', activeClass: 'border-green-500 bg-green-50/50 text-green-900' },
    { id: 'bank', label: 'BANK / CHEQUE', icon: <Landmark className="w-5 h-5" />, color: 'bg-blue-500', activeClass: 'border-blue-500 bg-blue-50/50 text-blue-900' },
    { id: 'card', label: 'CARD', icon: <CreditCard className="w-5 h-5" />, color: 'bg-purple-500', activeClass: 'border-purple-500 bg-purple-50/50 text-purple-900' },
    { id: 'credit', label: 'CREDIT', icon: <UserCheck className="w-5 h-5" />, color: 'bg-orange-500', activeClass: 'border-orange-500 bg-orange-50/50 text-orange-900' },
  ] as const;

  return (
    <div className="flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
      {methods.map((method) => {
        const isActive = selected === method.id;
        
        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id as PaymentMethodType)}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-4 p-3 md:p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200 min-w-[120px] md:min-w-0 ${
              isActive 
                ? method.activeClass 
                : 'border-transparent bg-white hover:border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'
            }`}
          >
            <div className={`p-1.5 md:p-2 rounded-lg text-white ${isActive ? method.color : 'bg-gray-400'}`}>
              {method.icon}
            </div>
            <span className={`text-xs md:text-sm font-bold tracking-wide whitespace-nowrap ${isActive ? '' : 'opacity-80'}`}>
              {method.label}
            </span>
            
            {isActive && (
              <div className="hidden md:block ml-auto w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
