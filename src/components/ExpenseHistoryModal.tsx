import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Expense } from '../types';

interface ExpenseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSupplier: string; // The supplier/description to filter by and pre-fill
}

const ExpenseHistoryModal: React.FC<ExpenseHistoryModalProps> = ({ isOpen, onClose, defaultSupplier }) => {
  const { expenses, saveExpense, currentCashier } = usePosStore();
  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('supplies');
  const [receipt, setReceipt] = useState('');
  const [description, setDescription] = useState(defaultSupplier); // Allow editing, but default to supplier

  if (!isOpen) return null;

  // Filter expenses by description (supplier name)
  // We use a lenient includes check to match variations
  const filteredExpenses = expenses.filter(e =>
    (e.description || '').toLowerCase().includes(defaultSupplier.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const categories = [
    { value: 'supplies', label: 'Supplies' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent' },
    { value: 'salary', label: 'Salary' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'other', label: 'Other' }
  ];

  const handleAddExpense = () => {
    if (!amount || !currentCashier) return;

    const expense: Expense = {
      id: `EXP${Date.now()}`,
      description: description,
      amount: parseFloat(amount),
      category: category,
      timestamp: new Date().toISOString(),
      cashier: currentCashier.name,
      receipt: receipt || undefined
    };

    saveExpense(expense);
    setIsAdding(false);
    setAmount('');
    setReceipt('');
    // We keep the description/supplier for consecutive adds if needed, or reset to default
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-1/2 rounded-lg bg-white p-6 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{defaultSupplier}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <span className="text-2xl">&times;</span>
            </button>
        </div>

        {isAdding ? (
          <div className="overflow-y-auto p-1">
            <h3 className="text-lg font-semibold mb-4">Add New Expense</h3>

            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Supplier</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mb-2 w-full rounded border p-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-2 w-full rounded border p-2"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mb-2 w-full rounded border p-2"
            >
                {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt No (Optional)</label>
            <input
              type="text"
              placeholder="Receipt No"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              className="mb-4 w-full rounded border p-2"
            />

            <div className="flex justify-end pt-4 border-t">
              <button onClick={() => setIsAdding(false)} className="mr-2 rounded bg-gray-300 px-4 py-2 hover:bg-gray-400">
                Cancel
              </button>
              <button onClick={handleAddExpense} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Save Expense
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="mb-4 flex justify-between items-center bg-gray-50 p-3 rounded">
              <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                      KES {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </p>
              </div>
              <button onClick={() => setIsAdding(true)} className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                + Add Expense
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                    <tr>
                        <th className="p-2 border-b">Date</th>
                        <th className="p-2 border-b">Details</th>
                        <th className="p-2 border-b text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredExpenses.map(expense => (
                        <tr key={expense.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 text-sm text-gray-600">
                                {new Date(expense.timestamp).toLocaleDateString()}
                            </td>
                            <td className="p-2">
                                <div className="font-medium">{expense.description}</div>
                                <div className="text-xs text-gray-500">{expense.category}</div>
                            </td>
                            <td className="p-2 text-right font-bold text-gray-800">
                                KES {expense.amount.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-gray-500">
                                No history found for "{defaultSupplier}"
                            </td>
                        </tr>
                    )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end pt-2 border-t">
              <button onClick={onClose} className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseHistoryModal;
