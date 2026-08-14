import React, { useState } from 'react';
import { usePosStore } from '../../store/posStore';
import { CreditCard, CheckCircle2 } from 'lucide-react';

interface Props {
  totalAmount: number;
  formattedTotal: string;
}

export default function CardPayment({ totalAmount, formattedTotal }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { completeTransaction } = usePosStore();

  const handleMarkPaid = () => {
    setIsProcessing(true);
    // Simulate terminal response time
    setTimeout(() => {
      completeTransaction('card', undefined, { amountTendered: totalAmount, change: 0 });
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center mt-4">
      <div className="bg-gray-50 px-4 py-2 rounded-full mb-4 border border-gray-200">
        <span className="text-lg font-bold text-gray-900">{formattedTotal}</span>
      </div>
      
      <p className="text-xs text-gray-500 mb-6 max-w-[250px]">
        Process the payment on your external card terminal (PDQ).
      </p>

      <div className="w-full space-y-4">
        <button 
          onClick={handleMarkPaid}
          disabled={isProcessing}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              MARK AS PAID
            </>
          )}
        </button>
      </div>
    </div>
  );
}
