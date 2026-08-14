import React, { useState } from 'react';
import { usePosStore } from '../../store/posStore';
import { UserCheck, CheckCircle2, Search, User } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface Props {
  totalAmount: number;
  formattedTotal: string;
}

export default function CreditPayment({ totalAmount, formattedTotal }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const { creditCustomers, completeTransaction } = usePosStore();
  const { toast } = useToast();

  // Simple local search
  const filteredCustomers = creditCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const handleConfirm = () => {
    if (!selectedCustomer) return;
    
    completeTransaction('credit', selectedCustomer.name, { amountTendered: totalAmount, change: 0 });
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      {!selectedCustomer ? (
        <div className="flex-1 flex flex-col">
          <div className="relative mb-4">
            <input 
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name or phone..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 p-2 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No customers found.</div>
            ) : (
              filteredCustomers.map(customer => {
                const currentBalance = customer.balance || 0;
                
                return (
                  <button 
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left bg-white border border-gray-200 hover:border-orange-500 hover:shadow-sm cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-400 uppercase">Owes</p>
                      <p className={`font-bold text-red-500`}>
                        KSh {currentBalance.toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4 text-center relative">
            <button 
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-3 right-3 text-xs font-bold text-gray-500 hover:text-gray-900 underline"
            >
              CHANGE
            </button>
            <div className="w-12 h-12 mx-auto rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
              <User className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h4>
            <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-auto shadow-sm">
            <div className="p-3 flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Sale Amount</span>
              <span className="font-bold text-gray-900">{formattedTotal}</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Current Balance</span>
              <span className="font-bold text-gray-900">KSh {(selectedCustomer.balance || 0).toLocaleString()}</span>
            </div>
            <div className="p-3 flex justify-between items-center bg-gray-50">
              <span className="text-gray-900 font-bold text-sm">New Balance</span>
              <span className="font-bold text-orange-600 text-base">KSh {((selectedCustomer.balance || 0) + totalAmount).toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={handleConfirm}
            className="mt-4 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-200"
          >
            <CheckCircle2 className="w-5 h-5" />
            CONFIRM CREDIT SALE
          </button>
        </div>
      )}
    </div>
  );
}
