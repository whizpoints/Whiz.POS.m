import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Expense } from '../types';
import { DollarSign, Plus, Receipt, TrendingUp, Calendar, Search, Filter, Copy, Edit2, Trash2, X } from 'lucide-react';
import ExpenseHistoryModal from './ExpenseHistoryModal';

export default function ExpenseTracker() {
  const { expenses, saveExpense, currentCashier, setCurrentPage, deleteExpense, updateExpense } = usePosStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quickAddAmount, setQuickAddAmount] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Main Add Form State (Legacy/Generic Add)
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'supplies',
    receipt: ''
  });

  const categories = [
    { value: 'supplies', label: 'Supplies' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent' },
    { value: 'salary', label: 'Salary' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'other', label: 'Other' }
  ];

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.cashier || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const expensesByCategory = categories.map(category => ({
    ...category,
    total: filteredExpenses
      .filter(e => e.category === category.value)
      .reduce((sum, e) => sum + e.amount, 0)
  })).filter(cat => cat.total > 0);

  const todayExpenses = expenses.filter(expense => 
    (expense.timestamp || '').startsWith(new Date().toLocaleDateString('en-CA'))
  );

  const todayTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddExpense = () => {
    if (!formData.description || !formData.amount || !currentCashier) return;

    if (editingExpenseId) {
        updateExpense(editingExpenseId, {
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            receipt: formData.receipt || undefined
        });
        setEditingExpenseId(null);
    } else {
        const expense: Expense = {
            id: `EXP${Date.now()}`,
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category,
            timestamp: new Date().toISOString(),
            cashier: currentCashier.name,
            receipt: formData.receipt || undefined
        };
        saveExpense(expense);
    }

    resetForm();
    setShowAddForm(false);
  };

  const handleQuickAdd = () => {
    if (!quickAddAmount || !currentCashier) return;

    const expense: Expense = {
        id: `EXP${Date.now()}`,
        description: 'Quick Expense',
        amount: parseFloat(quickAddAmount),
        category: 'other',
        timestamp: new Date().toISOString(),
        cashier: currentCashier.name
    };

    saveExpense(expense);
    setQuickAddAmount('');
  };

  const isAdminOrManager = currentCashier?.role === 'admin' || currentCashier?.role === 'manager';

  const handleEdit = (expense: Expense, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent opening modal
      if (!isAdminOrManager) {
        setNotification({ type: 'error', message: "Only Admins or Managers can edit expenses." });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      setFormData({
          description: expense.description,
          amount: expense.amount.toString(),
          category: expense.category,
          receipt: expense.receipt || ''
      });
      setEditingExpenseId(expense.id);
      setShowAddForm(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent opening modal
      if (!isAdminOrManager) {
        setNotification({ type: 'error', message: "Only Admins or Managers can delete expenses." });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      if(confirm('Are you sure you want to delete this expense?')) {
          deleteExpense(id);
          setNotification({ type: 'success', message: "Expense deleted." });
          setTimeout(() => setNotification(null), 3000);
      }
  };

  const handleRowClick = (expense: Expense) => {
    setSelectedSupplier(expense.description);
    setIsModalOpen(true);
  };

  // Unique descriptions for autocomplete
  const expenseDescriptions = [...new Set(expenses.map(e => e.description))];

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'supplies',
      receipt: ''
    });
    setEditingExpenseId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {notification && (
          <div className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 text-white font-medium animate-bounce ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {notification.message}
          </div>
      )}
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('pos')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back to POS
              </button>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">Expense Tracker</h1>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Quick Add Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
             <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Add Expense (Amount Only)</h3>
             <div className="flex gap-2">
                 <input
                    type="number"
                    value={quickAddAmount}
                    onChange={(e) => setQuickAddAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
                 <button
                    onClick={handleQuickAdd}
                    disabled={!quickAddAmount}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                 >
                    Quick Add
                 </button>
             </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Expenses</p>
                <p className="text-2xl font-bold text-gray-800">KES {todayTotal.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{todayExpenses.length} transactions</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-800">KES {totalExpenses.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{filteredExpenses.length} transactions</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Expense</p>
                <p className="text-2xl font-bold text-gray-800">
                  KES {filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toFixed(2) : '0.00'}
                </p>
                <p className="text-sm text-gray-500">Per transaction</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search expenses..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="md:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expense List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Recent Expenses</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Date & Time</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Description</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Amount</th>
                    <th className="text-right py-3 px-6 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.slice(0, 20).map((expense) => (
                    <tr
                        key={expense.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(expense)}
                        title="Click to view history/add similar"
                    >
                      <td className="py-3 px-6">
                        <div>
                          <div className="text-sm text-gray-800">
                            {new Date(expense.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(expense.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div>
                          <div className="font-medium text-gray-800">{expense.description}</div>
                          {expense.receipt && (
                            <div className="text-xs text-blue-600 flex items-center">
                              <Receipt className="w-3 h-3 mr-1" />
                              Receipt available
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {categories.find(c => c.value === expense.category)?.label || expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-medium text-red-600">
                        -KES {expense.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                              <button onClick={(e) => handleEdit(expense, e)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                  <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => handleDelete(expense.id, e)} className="text-red-600 hover:text-red-800" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredExpenses.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No expenses found</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Add your first expense
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">By Category</h3>
            <div className="space-y-3">
              {expensesByCategory.map((category) => {
                const percentage = totalExpenses > 0 ? (category.total / totalExpenses) * 100 : 0;
                return (
                  <div key={category.value} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{category.label}</span>
                      <span className="text-sm font-bold text-gray-800">KES {category.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                  </div>
                );
              })}
              
              {expensesByCategory.length === 0 && (
                <p className="text-gray-500 text-center py-4">No expense data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Add/Edit Expense Modal (Generic) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingExpenseId ? 'Edit Expense' : 'Add New Expense'}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    list="expense-suggestions"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter expense description"
                    autoFocus
                  />
                  <datalist id="expense-suggestions">
                    {expenseDescriptions.map((desc, i) => (
                        <option key={i} value={desc} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.receipt}
                    onChange={(e) => setFormData(prev => ({ ...prev, receipt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter receipt number"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingExpenseId ? 'Update' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier History Modal */}
      <ExpenseHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultSupplier={selectedSupplier}
      />
    </div>
  );
}
