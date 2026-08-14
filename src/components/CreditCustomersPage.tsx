import React, { useState, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { CreditCustomer, CreditPayment, Transaction } from '../store/posStore';
import { Users, Phone, DollarSign, CheckCircle, Clock, Search, Plus, Edit, Trash2, History, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';

export default function CreditCustomersPage() {
  const { 
    creditCustomers, 
    transactions,
    creditPayments,
    setCurrentPage, 
    saveCreditCustomer, 
    updateCreditCustomer,
    deleteCreditCustomer,
    getUnpaidCredits,
    addCreditPayment
  } = usePosStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CreditCustomer | null>(null);

  // State for paying a specific transaction
  const [payingTransactionId, setPayingTransactionId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const filteredCustomers = useMemo(() => {
    return creditCustomers.filter(customer =>
      (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.toString().includes(searchTerm))
    );
  }, [creditCustomers, searchTerm]);

  const customerNames = [...new Set(creditCustomers.map(c => c.name))];

  const unpaidCredits = useMemo(() => {
    return getUnpaidCredits();
  }, [getUnpaidCredits]);

  const totalUnpaid = useMemo(() => {
    return unpaidCredits.reduce((sum, customer) => sum + (customer.balance || 0), 0);
  }, [unpaidCredits]);

  // Calculate daily summary
  const dailyCreditSummary = useMemo(() => {
      const today = new Date().toLocaleDateString('en-CA');

      const newCredits = transactions.filter(t =>
          new Date(t.timestamp).toLocaleDateString('en-CA') === today &&
          t.paymentMethod === 'credit'
      );
      const newCreditTotal = newCredits.reduce((sum, t) => sum + t.total, 0);

      const paymentsToday = creditPayments.filter(p =>
          new Date(p.date).toLocaleDateString('en-CA') === today
      );
      const paymentsTotal = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

      return {
          newCredit: newCreditTotal,
          paidToday: paymentsTotal
      };
  }, [transactions, creditPayments]);

  const handleAddCustomer = () => {
    if (!formData.name.trim()) return;

    const newCustomer: CreditCustomer = {
      id: `CUST${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      totalCredit: 0,
      paidAmount: 0,
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    saveCreditCustomer(newCustomer);
    setFormData({ name: '', phone: '' });
    setShowAddForm(false);
  };

  const handleEditCustomer = (customer: CreditCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
    });
  };

  const handleUpdateCustomer = () => {
    if (!editingCustomer || !formData.name.trim()) return;

    updateCreditCustomer(editingCustomer.id, {
      name: formData.name,
      phone: formData.phone,
      lastUpdated: new Date().toISOString(),
    });

    setEditingCustomer(null);
    setFormData({ name: '', phone: '' });
  };

  const handlePayment = (customerId: string, amount: number, transactionId?: string) => {
    if (amount <= 0) return;
    addCreditPayment(customerId, amount, transactionId);
    setPayingTransactionId(null);
    setPaymentAmount('');
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      deleteCreditCustomer(customerId);
    }
  };

  const getCustomerTransactions = (customer: CreditCustomer) => {
    if (!customer || !customer.transactions) {
      return [];
    }
    return transactions.filter(t => (customer.transactions || []).includes(t.id));
  };

  const getCustomerHistory = (customer: CreditCustomer) => {
      // 1. Get all credit sales for this customer
      const sales = transactions.filter(t =>
          (t.paymentMethod === 'credit' && t.creditCustomer === customer.name) ||
          (customer.transactions || []).includes(t.id)
      ).map(t => {
          // Calculate how much of this specific transaction has been paid
          const paymentsForThisTxn = creditPayments
              .filter(p => p.transactionId === t.id)
              .reduce((sum, p) => sum + p.amount, 0);

          const remaining = t.total - paymentsForThisTxn;

          return {
              type: 'sale',
              date: t.timestamp,
              amount: t.total,
              paid: paymentsForThisTxn,
              remaining: Math.max(0, remaining),
              id: t.id,
              items: t.items // Include items for detail
          };
      });

      // 2. Get all payments
      const payments = creditPayments.filter(p => p.customerId === customer.id)
          .map(p => ({
              type: 'payment',
              date: p.date,
              amount: p.amount,
              id: p.id,
              transactionId: p.transactionId // Reference to which txn it paid
          }));

      // Combine and sort by date descending
      return [...sales, ...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">Credit Customers</h1>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-800">{creditCustomers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unpaid Credits</p>
                <p className="text-2xl font-bold text-gray-800">{unpaidCredits.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-800">KES {totalUnpaid.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">Today's Activity</p>
                    <div className="text-xs">
                        <p className="text-purple-600">Issued: +{dailyCreditSummary.newCredit.toFixed(0)}</p>
                        <p className="text-green-600">Paid: -{dailyCreditSummary.paidToday.toFixed(0)}</p>
                    </div>
                </div>
                <History className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              list="customer-suggestions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers by name or phone..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <datalist id="customer-suggestions">
                {customerNames.map(name => <option key={name} value={name} />)}
            </datalist>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Customer</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Phone</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Total Credit</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Paid</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Balance</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {getCustomerTransactions(customer).length} transactions
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium">
                      KES {(customer.totalCredit || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 font-medium text-green-600">
                      KES {(customer.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-medium ${
                        (customer.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        KES {(customer.balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {(customer.balance || 0) > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          <Clock className="w-3 h-3" />
                          <span>Unpaid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          <CheckCircle className="w-3 h-3" />
                          <span>Paid</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setHistoryCustomer(customer)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                            title="View History & Pay Specific"
                        >
                            <History className="w-4 h-4" /> Details
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No customers found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Add your first customer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {(showAddForm || editingCustomer) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer name"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingCustomer(null);
                    setFormData({ name: '', phone: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCustomer ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History & Payment Modal */}
      {historyCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{historyCustomer.name}</h3>
                        <p className="text-sm text-gray-500">Transaction History</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="text-right">
                              <p className="text-xs text-gray-500 uppercase font-semibold">Current Balance</p>
                              <p className={`text-xl font-bold ${historyCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                KES {historyCustomer.balance.toFixed(2)}
                              </p>
                          </div>
                          <button onClick={() => setHistoryCustomer(null)} className="text-gray-400 hover:text-gray-600 p-2">
                              <span className="text-2xl">&times;</span>
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                              <tr className="text-gray-500 text-xs uppercase tracking-wider">
                                  <th className="py-3 px-6">Date</th>
                                  <th className="py-3 px-6">Details</th>
                                  <th className="py-3 px-6 text-right">Amount</th>
                                  <th className="py-3 px-6 text-right">Status / Paid</th>
                                  <th className="py-3 px-6 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {getCustomerHistory(historyCustomer).map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                                      <td className="py-4 px-6 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">{new Date(item.date).toLocaleDateString()}</div>
                                          <div className="text-xs text-gray-500">{new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                      </td>

                                      <td className="py-4 px-6">
                                          <div className="flex items-center gap-2 mb-1">
                                              {item.type === 'sale' ? (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                      SALE
                                                  </span>
                                              ) : (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                      PAYMENT
                                                  </span>
                                              )}
                                              <span className="text-xs text-gray-400">#{item.id.slice(-6)}</span>
                                          </div>
                                          {item.type === 'sale' && (item as any).items && (
                                              <div className="text-xs text-gray-600 max-w-xs truncate">
                                                  {(item as any).items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(', ')}
                                              </div>
                                          )}
                                          {item.type === 'payment' && (item as any).transactionId && (
                                              <div className="text-xs text-gray-500">
                                                  Paying Transaction #{(item as any).transactionId.slice(-6)}
                                              </div>
                                          )}
                                      </td>

                                      <td className={`py-4 px-6 text-right font-medium ${item.type === 'sale' ? 'text-gray-900' : 'text-green-600'}`}>
                                          KES {item.amount.toFixed(2)}
                                      </td>

                                      <td className="py-4 px-6 text-right">
                                          {item.type === 'sale' ? (
                                              <div>
                                                  {(item as any).remaining <= 0 ? (
                                                      <span className="text-green-600 text-xs font-bold flex items-center justify-end gap-1">
                                                          <CheckCircle className="w-3 h-3" /> Paid Full
                                                      </span>
                                                  ) : (
                                                      <div className="flex flex-col items-end">
                                                          <span className="text-xs text-gray-500">Paid: {(item as any).paid.toFixed(2)}</span>
                                                          <span className="text-xs text-red-600 font-bold">Due: {(item as any).remaining.toFixed(2)}</span>
                                                      </div>
                                                  )}
                                              </div>
                                          ) : (
                                              <span className="text-gray-400 text-xs">-</span>
                                          )}
                                      </td>

                                      <td className="py-4 px-6 text-right">
                                          {item.type === 'sale' && (item as any).remaining > 0 ? (
                                              <button
                                                  onClick={() => {
                                                      setPayingTransactionId(item.id);
                                                      setPaymentAmount((item as any).remaining.toString());
                                                  }}
                                                  className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition-colors shadow-sm"
                                              >
                                                  Pay Bill
                                              </button>
                                          ) : null}
                                      </td>
                                  </tr>
                              ))}
                              {getCustomerHistory(historyCustomer).length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="py-8 text-center text-gray-500">No transaction history found</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  <div className="p-4 bg-gray-50 border-t flex justify-end">
                      <button
                          onClick={() => setHistoryCustomer(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                      >
                          Close
                      </button>
                  </div>
              </div>

              {/* Nested Modal for Payment Confirmation */}
              {payingTransactionId && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 backdrop-blur-sm">
                      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm border border-gray-100">
                          <h4 className="text-lg font-bold text-gray-800 mb-4">Confirm Payment</h4>
                          <p className="text-sm text-gray-600 mb-4">
                              Paying for Transaction <span className="font-mono text-gray-800">#{payingTransactionId.slice(-6)}</span>
                          </p>

                          <div className="mb-4">
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount to Pay</label>
                              <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                  <input
                                      type="number"
                                      value={paymentAmount}
                                      onChange={(e) => setPaymentAmount(e.target.value)}
                                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-bold text-gray-800"
                                      autoFocus
                                  />
                              </div>
                          </div>

                          <div className="flex gap-3">
                              <button
                                  onClick={() => setPayingTransactionId(null)}
                                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                              >
                                  Cancel
                              </button>
                              <button
                                  onClick={() => handlePayment(historyCustomer.id, parseFloat(paymentAmount), payingTransactionId)}
                                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm"
                              >
                                  Confirm
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
