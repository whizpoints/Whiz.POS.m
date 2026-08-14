import React, { useState, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, Search, Undo2, Trash2, X } from 'lucide-react';
import DeleteReceiptsModal from './DeleteReceiptsModal';

const PreviousReceiptsPage: React.FC = () => {
  const transactions = usePosStore((state) => state.transactions);
  const reprintTransaction = usePosStore((state) => state.reprintTransaction);
  const reverseTransaction = usePosStore((state) => state.reverseTransaction);
  const users = usePosStore((state) => state.users);
  const currentCashier = usePosStore((state) => state.currentCashier);

  // Check if current user is admin or manager
  const isAdminOrManager = useMemo(() => {
    const user = users.find(u => u.id === currentCashier?.id);
    return user?.role === 'admin' || user?.role === 'manager';
  }, [users, currentCashier]);

  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleReprint = (transactionId: string) => {
    reprintTransaction(transactionId);
  };

  const handleReverse = (transactionId: string) => {
    if (confirm('Are you sure you want to reverse this transaction? This will refund the amount and restore stock.')) {
        reverseTransaction(transactionId);
    }
  };

  // Sort transactions by date descending - Memoized
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [transactions]);

  // Filter transactions - Memoized
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter(tx =>
      tx.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedTransactions, searchTerm]);

  // Unique IDs for datalist - Memoized
  const transactionIds = useMemo(() => {
     return [...new Set(transactions.map(t => t.id))];
  }, [transactions]);

  return (
    <div className="p-4 bg-gray-100 min-h-screen relative">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Previous Receipts</h1>
            <p className="text-sm text-gray-500">View transaction history and reprint receipts</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             {isAdminOrManager && (
                 <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex items-center space-x-2 bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors"
                 >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Receipts</span>
                 </button>
             )}

             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search Receipt No..."
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    list="receipt-ids"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="off"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                <datalist id="receipt-ids">
                    {transactionIds.slice(0, 100).map(id => <option key={id} value={id} />)}
                </datalist>
             </div>

             <button
                onClick={() => navigate(-1)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
             >
                Back
             </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="min-w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Receipt ID</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Cashier</th>
                <th scope="col" className="px-6 py-3">Items</th>
                <th scope="col" className="px-6 py-3">Total</th>
                <th scope="col" className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{tx.id}</td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">{tx.cashier}</td>
                    <td className="px-6 py-4">{tx.items.length} items</td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                        {tx.status === 'refunded' ? (
                            <span className="text-red-500 line-through">Ksh. {tx.total.toFixed(2)}</span>
                        ) : (
                            <span>Ksh. {tx.total.toFixed(2)}</span>
                        )}
                         {tx.status === 'refunded' && <span className="block text-xs text-red-600 font-bold uppercase">Reversed</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                            onClick={() => handleReprint(tx.id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                            title="Reprint Receipt"
                        >
                            <RefreshCcw className="w-4 h-4 mr-1" />
                            Reprint
                        </button>

                        {isAdminOrManager && tx.status !== 'refunded' && (
                            <button
                                onClick={() => handleReverse(tx.id)}
                                className="text-red-600 hover:text-red-800 flex items-center"
                                title="Reverse Transaction"
                            >
                                <Undo2 className="w-4 h-4 mr-1" />
                                Reverse
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">Receipt Not Found</h3>
                        <p className="max-w-xs mx-auto text-center font-medium">
                            Receipt either didn't exist or was deleted, check your receipts no again
                        </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteReceiptsModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default PreviousReceiptsPage;
