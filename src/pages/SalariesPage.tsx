import React, { useState } from 'react';
import { usePosStore, Salary } from '../store/posStore';
import {
  Plus,
  Trash2,
  Search,
  DollarSign,
  Calendar,
  User,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function SalariesPage() {
  const { salaries, addSalary, deleteSalary, currentCashier } = usePosStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [newSalary, setNewSalary] = useState<Partial<Salary>>({
    type: 'full',
    amount: 0,
    employeeName: '',
    notes: ''
  });

  const filteredSalaries = salaries.filter(s =>
    s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalary.employeeName || !newSalary.amount) return;

    const salary: Salary = {
      id: `SAL${Date.now()}`,
      employeeName: newSalary.employeeName,
      amount: Number(newSalary.amount),
      type: newSalary.type as 'full' | 'advance',
      date: new Date().toISOString(),
      notes: newSalary.notes
    };

    addSalary(salary);
    setIsAddDialogOpen(false);
    setNewSalary({ type: 'full', amount: 0, employeeName: '', notes: '' });
  };

  if (currentCashier?.role !== 'admin') {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <h2 className="text-xl font-bold">Access Restricted</h2>
              <p>Only administrators can view this page.</p>
          </div>
      );
  }

  return (
    <div className="p-6 h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Salaries & Advances</h1>
          <p className="text-slate-500">Manage employee payments and records.</p>
        </div>
        <button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Record Salary
        </button>
      </div>

      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Notes</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No salary records found.
                  </td>
                </tr>
              ) : (
                filteredSalaries.map((salary) => (
                  <tr key={salary.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(salary.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {salary.employeeName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold uppercase",
                        salary.type === 'full'
                          ? "bg-sky-100 text-sky-700"
                          : "bg-orange-100 text-orange-700"
                      )}>
                        {salary.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {salary.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      Ksh. {salary.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this record?')) {
                            deleteSalary(salary.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
               <h2 className="text-lg font-bold">Record Salary Payment</h2>
               <button onClick={() => setIsAddDialogOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                 <X className="w-5 h-5" />
               </button>
            </div>

            <form onSubmit={handleAddSalary} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Employee Name</label>
                  <input
                    value={newSalary.employeeName}
                    onChange={(e) => setNewSalary({ ...newSalary, employeeName: e.target.value })}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Amount (Ksh)</label>
                  <input
                    type="number"
                    value={newSalary.amount || ''}
                    onChange={(e) => setNewSalary({ ...newSalary, amount: Number(e.target.value) })}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Payment Type</label>
                  <select
                    value={newSalary.type}
                    onChange={(e: any) => setNewSalary({ ...newSalary, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
                  >
                    <option value="full">Full Salary</option>
                    <option value="advance">Advance Payment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newSalary.notes}
                    onChange={(e) => setNewSalary({ ...newSalary, notes: e.target.value })}
                    placeholder="Optional details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-24 resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                    <button
                        type="button"
                        onClick={() => setIsAddDialogOpen(false)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                    >
                        Save Record
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
