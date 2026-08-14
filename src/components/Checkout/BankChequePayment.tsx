import React, { useState } from 'react';
import { usePosStore } from '../../store/posStore';
import { Landmark, CheckCircle2 } from 'lucide-react';

interface Props {
  totalAmount: number;
  formattedTotal: string;
}

export default function BankChequePayment({ totalAmount, formattedTotal }: Props) {
  const [type, setType] = useState<'bank' | 'cheque'>('bank');
  const [reference, setReference] = useState('');
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');
  const { completeTransaction } = usePosStore();

  const handleConfirm = () => {
    completeTransaction('bank', undefined, { 
      amountTendered: totalAmount, 
      change: 0,
      // In a real implementation we would pass reference, bank, and notes to the backend
    });
  };

  const isFormValid = reference.trim().length > 3 && bank.length > 0;

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4 flex items-center justify-between mt-2">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Amount Due</p>
        <p className="text-2xl font-bold text-gray-900">{formattedTotal}</p>
      </div>

      <div className="space-y-3 flex-1">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Payment Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setType('bank')}
              className={`py-2 rounded-lg border-2 font-bold transition-colors ${type === 'bank' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Bank Transfer
            </button>
            <button 
              onClick={() => setType('cheque')}
              className={`py-2 rounded-lg border-2 font-bold transition-colors ${type === 'cheque' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Cheque
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
          <select 
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>Select Bank...</option>
            <option value="kcb">KCB Bank</option>
            <option value="equity">Equity Bank</option>
            <option value="coop">Co-operative Bank</option>
            <option value="stanbic">Stanbic Bank</option>
            <option value="sc">Standard Chartered</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {type === 'bank' ? 'Reference / EFT Number' : 'Cheque Number'}
          </label>
          <input 
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Enter reference..."
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details..."
            rows={1}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          ></textarea>
        </div>
      </div>

      <button 
        onClick={handleConfirm}
        disabled={!isFormValid}
        className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
      >
        <CheckCircle2 className="w-5 h-5" />
        CONFIRM PAYMENT
      </button>
    </div>
  );
}
