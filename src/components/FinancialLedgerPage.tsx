import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { usePosStore } from '../store/posStore';
import { 
  BookOpen, TrendingUp, TrendingDown, DollarSign, FileSpreadsheet, Scale, History, Plus
} from 'lucide-react';

export default function FinancialLedgerPage() {
  const { transactions, expenses, salaries, purchaseOrders } = usePosStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'journal' | 'coa'>('overview');

  // Compute Revenue
  const totalRevenue = useMemo(() => {
    return transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.total, 0);
  }, [transactions]);

  // Compute COGS (Cost of Goods Sold) based on purchased items (simplified)
  const cogs = useMemo(() => {
    return purchaseOrders
      .filter(po => po.status === 'received')
      .reduce((sum, po) => sum + po.totalAmount, 0);
  }, [purchaseOrders]);

  // Compute Opex (Operating Expenses)
  const opex = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const salaryTotal = salaries.reduce((sum, s) => sum + s.amount, 0);
    return expenseTotal + salaryTotal;
  }, [expenses, salaries]);

  const netIncome = totalRevenue - cogs - opex;

  // Synthesize some journal entries
  const journalEntries = useMemo(() => {
    const entries: any[] = [];
    
    // Revenue Entries
    transactions.forEach(t => {
      entries.push({
        id: `J-REV-${t.id}`,
        date: t.timestamp,
        description: `Sales Revenue (Tx: ${t.id})`,
        account: 'Revenue',
        debit: 0,
        credit: t.total
      });
      entries.push({
        id: `J-CASH-${t.id}`,
        date: t.timestamp,
        description: `Cash/Bank (${t.paymentMethod})`,
        account: 'Assets',
        debit: t.total,
        credit: 0
      });
    });

    // Expense Entries
    expenses.forEach(e => {
      entries.push({
        id: `J-EXP-${e.id}`,
        date: e.timestamp,
        description: `Operating Expense: ${e.category} - ${e.description}`,
        account: 'Expenses',
        debit: e.amount,
        credit: 0
      });
      entries.push({
        id: `J-CASH-OUT-${e.id}`,
        date: e.timestamp,
        description: `Cash/Bank (Expense Payment)`,
        account: 'Assets',
        debit: 0,
        credit: e.amount
      });
    });

    // PO (Inventory / AP)
    purchaseOrders.filter(po => po.status === 'received').forEach(po => {
      entries.push({
        id: `J-INV-${po.id}`,
        date: po.dateCreated,
        description: `Inventory Asset (PO: ${po.id})`,
        account: 'Assets (Inventory)',
        debit: po.totalAmount,
        credit: 0
      });
      entries.push({
        id: `J-AP-${po.id}`,
        date: po.dateCreated,
        description: `Accounts Payable (${po.supplierName})`,
        account: 'Liabilities',
        debit: 0,
        credit: po.totalAmount
      });
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, expenses, purchaseOrders]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Financial Ledger</h1>
              <p className="text-gray-600">General ledger, chart of accounts, and financial health</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
              <TrendingUp className="w-5 h-5 mr-2" /> P&L Overview
            </button>
            <button onClick={() => setActiveTab('journal')} className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'journal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
              <History className="w-5 h-5 mr-2" /> General Journal
            </button>
            <button onClick={() => setActiveTab('coa')} className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'coa' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
              <Scale className="w-5 h-5 mr-2" /> Chart of Accounts
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3 text-emerald-600 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-bold">Total Revenue</span>
                </div>
                <p className="text-2xl font-black text-gray-900">KES {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3 text-orange-600 mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="font-bold">COGS (Purchases)</span>
                </div>
                <p className="text-2xl font-black text-gray-900">KES {cogs.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3 text-rose-600 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-bold">Operating Expenses</span>
                </div>
                <p className="text-2xl font-black text-gray-900">KES {opex.toLocaleString()}</p>
              </div>
              <div className={`p-6 rounded-xl shadow-sm border ${netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className={`flex items-center space-x-3 mb-2 ${netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-bold">Net Income</span>
                </div>
                <p className={`text-2xl font-black ${netIncome >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  KES {netIncome.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
               <h2 className="text-xl font-bold text-gray-800 mb-4">Financial Summary (P&L)</h2>
               <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b">
                   <span className="text-gray-600">Gross Revenue</span>
                   <span className="font-bold">KES {totalRevenue.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b">
                   <span className="text-gray-600">Cost of Goods Sold (COGS)</span>
                   <span className="font-bold text-rose-600">- KES {cogs.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 bg-gray-50 px-4 rounded-lg">
                   <span className="font-bold text-gray-800">Gross Profit</span>
                   <span className="font-black text-blue-600">KES {(totalRevenue - cogs).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b">
                   <span className="text-gray-600">Operating Expenses (Salaries, Rent, etc)</span>
                   <span className="font-bold text-rose-600">- KES {opex.toLocaleString()}</span>
                 </div>
                 <div className={`flex justify-between items-center py-4 px-4 rounded-lg ${netIncome >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                   <span className="font-black text-lg">Net Profit (Before Tax)</span>
                   <span className={`font-black text-xl ${netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>KES {netIncome.toLocaleString()}</span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Journal Tab */}
        {activeTab === 'journal' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">General Journal</h2>
              <button onClick={() => toast.success('Manual journal entries coming soon')} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                 <Plus className="w-5 h-5 mr-2" /> Manual Entry
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit (Dr)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {journalEntries.slice(0, 50).map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 text-sm">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{new Date(entry.date).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{entry.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">{entry.account}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {journalEntries.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">No journal entries found.</td></tr>
                  )}
                </tbody>
              </table>
              {journalEntries.length > 50 && <p className="text-center text-sm text-gray-400 mt-4">Showing last 50 entries.</p>}
            </div>
          </div>
        )}

        {/* Chart of Accounts */}
        {activeTab === 'coa' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-gray-800">Chart of Accounts</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h3 className="font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Assets</h3>
                   <ul className="space-y-3">
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Cash on Hand</span><span className="text-gray-500">1000</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">M-Pesa Till/Paybill</span><span className="text-gray-500">1010</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Bank Account</span><span className="text-gray-500">1020</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Inventory Asset</span><span className="text-gray-500">1200</span></li>
                   </ul>
                </div>
                <div>
                   <h3 className="font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Liabilities</h3>
                   <ul className="space-y-3">
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Accounts Payable</span><span className="text-gray-500">2000</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Sales Tax / VAT Payable</span><span className="text-gray-500">2100</span></li>
                   </ul>
                </div>
                <div>
                   <h3 className="font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Revenue</h3>
                   <ul className="space-y-3">
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Sales Income</span><span className="text-gray-500">4000</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Service Revenue</span><span className="text-gray-500">4100</span></li>
                   </ul>
                </div>
                <div>
                   <h3 className="font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Expenses</h3>
                   <ul className="space-y-3">
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Cost of Goods Sold (COGS)</span><span className="text-gray-500">5000</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Payroll & Salaries</span><span className="text-gray-500">6000</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Rent Expense</span><span className="text-gray-500">6100</span></li>
                      <li className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium text-gray-800">Utilities</span><span className="text-gray-500">6200</span></li>
                   </ul>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
