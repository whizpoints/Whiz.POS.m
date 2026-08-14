import React, { useState, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { BarChart3, TrendingUp, DollarSign, CreditCard, Calendar, Download, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as xlsx from 'xlsx';

export default function ReportsPage() {
  const { transactions, dailySummaries, expenses, getDailySales, getTransactionsByDateRange, setCurrentPage, businessSetup } = usePosStore();

  // Initialize range with today using local time.
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
    return {
      startDate: today,
      endDate: today
    };
  });
  const [reportType, setReportType] = useState<'sales' | 'expenses' | 'credits'>('sales');

  const filteredTransactions = useMemo(() => {
    // Robust local date parsing to prevent UTC shifts
    const [startYear, startMonth, startDay] = dateRange.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = dateRange.endDate.split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    return transactions.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate >= start && tDate <= end;
    });
  }, [dateRange, transactions]);

  const filteredExpenses = useMemo(() => {
    const [startYear, startMonth, startDay] = dateRange.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = dateRange.endDate.split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    return expenses.filter(expense => {
      // Handle missing timestamp safely - assume old date (epoch) if missing
      const expenseTimestamp = expense.timestamp || new Date(0).toISOString();
      const expenseDate = new Date(expenseTimestamp);

      return expenseDate >= start && expenseDate <= end;
    });
  }, [expenses, dateRange]);

  const salesSummary = useMemo(() => {
    let cash = filteredTransactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0);

    let mpesa = filteredTransactions
      .filter(t => t.paymentMethod === 'mpesa')
      .reduce((sum, t) => sum + t.total, 0);

    let credit = filteredTransactions
      .filter(t => t.paymentMethod === 'credit')
      .reduce((sum, t) => sum + t.total, 0);

    let transactionCount = filteredTransactions.length;
    let totalSales = cash + mpesa + credit;

    // Add archived data
    if (dailySummaries) {
      Object.values(dailySummaries).forEach(summary => {
        if (summary.date >= dateRange.startDate && summary.date <= dateRange.endDate) {
          cash += summary.cashTotal;
          mpesa += summary.mpesaTotal;
          credit += summary.creditTotal;
          totalSales += summary.totalSales;
          transactionCount += summary.transactionCount;
        }
      });
    }

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;

    return {
      cash,
      mpesa,
      credit,
      totalSales,
      totalExpenses,
      netProfit,
      transactionCount
    };
  }, [filteredTransactions, filteredExpenses, dailySummaries, dateRange]);

  const topProducts = useMemo(() => {
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
    
    filteredTransactions.forEach(transaction => {
      if (!transaction || !Array.isArray(transaction.items)) return;

      transaction.items.forEach(item => {
        if (!item || !item.product) return;

        const key = item.product?.name || (item as any).name || 'Unknown Product';
        const price = item.product?.price || 0;

        if (!productSales[key]) {
          productSales[key] = { quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += (item.quantity || 0);
        productSales[key].revenue += price * (item.quantity || 0);
      });
    });

    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredTransactions]);

  const downloadReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const businessName = businessSetup?.businessName || 'Whiz POS';
    const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    const fileName = `whiz-pos-report-${reportType}-${dateRange.startDate}.pdf`;

    // Header
    doc.setFontSize(20);
    doc.text(businessName, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(reportTitle, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, pageWidth / 2, 32, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });

    let yPos = 45;

    // Summary Section for Sales Report
    if (reportType === 'sales') {
      (doc as any).autoTable({
        startY: yPos,
        head: [['Summary Metric', 'Amount']],
        body: [
          ['Total Sales', `KES ${salesSummary.totalSales.toFixed(2)}`],
          ['Cash Sales', `KES ${salesSummary.cash.toFixed(2)}`],
          ['M-Pesa Sales', `KES ${salesSummary.mpesa.toFixed(2)}`],
          ['Credit Sales', `KES ${salesSummary.credit.toFixed(2)}`],
          ['Total Expenses', `KES ${salesSummary.totalExpenses.toFixed(2)}`],
          ['Net Profit', `KES ${salesSummary.netProfit.toFixed(2)}`],
          ['Transaction Count', salesSummary.transactionCount.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Main Data Table
    if (reportType === 'sales') {
      doc.text("Detailed Transactions", 14, yPos);
      yPos += 5;
      (doc as any).autoTable({
        startY: yPos,
        head: [['Time', 'Cashier', 'Method', 'Total', 'Items']],
        body: filteredTransactions.map(t => [
          new Date(t.timestamp).toLocaleTimeString(),
          t.cashier,
          t.paymentMethod,
          t.total.toFixed(2),
          t.items.length
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
      });
    } else if (reportType === 'expenses') {
      doc.text("Detailed Expenses", 14, yPos);
      yPos += 5;
      (doc as any).autoTable({
        startY: yPos,
        head: [['Time', 'Description', 'Category', 'Amount', 'By']],
        body: filteredExpenses.map(e => [
          new Date(e.timestamp || '').toLocaleDateString() + ' ' + new Date(e.timestamp || '').toLocaleTimeString(),
          e.description,
          e.category,
          e.amount.toFixed(2),
          e.cashier || 'N/A'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [192, 57, 43] },
      });
    } else if (reportType === 'credits') {
      // Logic for Credit Report PDF if needed, but 'credits' reportType was just an option in select
      // For now, reuse sales logic or implement credit specific table
       doc.text("Credit Report implementation pending for PDF", 14, yPos);
    }

    doc.save(fileName);
  };

  const downloadMpesaReconCSV = () => {
    const past48hrs = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const mpesaSales = transactions.filter(t => 
      t.paymentMethod?.toLowerCase() === 'mpesa' && 
      new Date(t.timestamp) >= past48hrs
    );

    const headers = ['Receipt No.', 'Completion Time', 'Details', 'Transaction Status', 'Paid In', 'Withdrawn', 'Balance'];
    const rows = mpesaSales.map(t => [
      t.mpesaCode || `***${t.id.slice(-6).toUpperCase()}`,
      new Date(t.timestamp).toLocaleString(),
      `${t.customerName || 'Walk-in'} - ${t.customerPhone || '0700000000'}`,
      'Completed',
      t.total.toString(),
      '0',
      '0'
    ]);

    const csvContent = [headers, ...rows];
    const ws = xlsx.utils.aoa_to_sheet(csvContent);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Statement");

    const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Safaricom_Recon_Format_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
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
              <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadMpesaReconCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>Export M-Pesa XLSX (48h)</span>
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Date Range</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => {
                const today = new Date().toLocaleDateString('en-CA');
                setDateRange({ startDate: today, endDate: today });
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const date = yesterday.toLocaleDateString('en-CA');
                setDateRange({ startDate: date, endDate: date });
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateRange({
                  startDate: firstDay.toLocaleDateString('en-CA'),
                  endDate: today.toLocaleDateString('en-CA')
                });
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateRange({
                  startDate: firstDay.toLocaleDateString('en-CA'),
                  endDate: lastDay.toLocaleDateString('en-CA')
                });
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              Last Month
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sales">Sales Report</option>
                <option value="expenses">Expenses Report</option>
                <option value="credits">Credit Report</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-800">
                  KES {salesSummary.totalSales.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash Sales</p>
                <p className="text-2xl font-bold text-gray-800">
                  KES {salesSummary.cash.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">M-Pesa Sales</p>
                <p className="text-2xl font-bold text-gray-800">
                  KES {salesSummary.mpesa.toFixed(2)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-gray-800">
                  KES {salesSummary.netProfit.toFixed(2)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cash</span>
                <span className="font-medium">KES {salesSummary.cash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">M-Pesa</span>
                <span className="font-medium">KES {salesSummary.mpesa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Credit</span>
                <span className="font-medium">KES {salesSummary.credit.toFixed(2)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total Sales</span>
                  <span className="font-bold text-lg text-blue-600">
                    KES {salesSummary.totalSales.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total Expenses</span>
                  <span className="font-bold text-lg text-red-600">
                    -KES {salesSummary.totalExpenses.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Net Profit</span>
                  <span className={`font-bold text-lg ${
                    salesSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    KES {salesSummary.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products</h3>
            <div className="space-y-3">
              {topProducts.slice(0, 8).map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-800">
                      KES {product.revenue.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {product.quantity} sold
                    </div>
                  </div>
                </div>
              ))}
              
              {topProducts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No sales data for selected period</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Cashier</th>
                  <th className="text-left py-2">Items</th>
                  <th className="text-left py-2">Payment</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 10).map((transaction) => (
                  <tr key={transaction.id} className="border-b">
                    <td className="py-2">
                      {new Date(transaction.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2">{transaction.cashier}</td>
                    <td className="py-2">{transaction.items.length}</td>
                    <td className="py-2 capitalize">{transaction.paymentMethod}</td>
                    <td className="py-2 text-right font-medium">
                      KES {transaction.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredTransactions.length === 0 && (
              <p className="text-gray-500 text-center py-4">No transactions found for selected period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
