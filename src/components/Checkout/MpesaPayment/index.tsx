import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import StkPush from './StkPush';
import TillMonitor from './TillMonitor';
import SearchModal from './SearchModal';
import MpesaQR from './MpesaQR';

interface Props {
  totalAmount: number;
  formattedTotal: string;
}

export default function MpesaPayment({ totalAmount, formattedTotal }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 flex-1">
        
        {/* Top Half: Split Layout (STK & QR) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Send STK Push</h4>
            <StkPush totalAmount={totalAmount} />
          </div>
          
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 flex flex-col justify-center items-center">
            <MpesaQR totalAmount={totalAmount} />
          </div>
        </div>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative bg-white px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Confirmation</div>
        </div>

        {/* Bottom Half: Confirmation / Till Monitor */}
        <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col min-h-[140px]">
          <TillMonitor totalAmount={totalAmount} />
        </div>
      </div>

      {/* SearchModal is now handled by CheckoutModal */}
    </div>
  );
}
