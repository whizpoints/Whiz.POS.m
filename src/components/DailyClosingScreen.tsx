import React, { useState, useEffect } from 'react';
import { usePosStore, ClosingReportData } from '../store/posStore';
import { Calendar, Printer, Download, User, Hash, Clock, CreditCard as CreditCardIcon, Briefcase } from 'lucide-react';

export default function DailyClosingScreen() {
  const { getDailyClosingReport, setCurrentPage, businessSetup } = usePosStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [report, setReport] = useState<ClosingReportData | null>(null);
  const [showDetailed, setShowDetailed] = useState(true);

  // Cash Reconciliation State
  const [cashDenominations, setCashDenominations] = useState({
      '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '40': 0, '20': 0, '10': 0, '5': 0, '1': 0
  });
  const [mpesaTotalInput, setMpesaTotalInput] = useState('');
  const [reconciliationVisible, setReconciliationVisible] = useState(false);

  useEffect(() => {
    const generatedReport = getDailyClosingReport(selectedDate);
    setReport(generatedReport);
  }, [selectedDate, getDailyClosingReport]);

  const handlePrint = () => {
    if (report && businessSetup && window.electron) {
        window.electron.printClosingReport(report, businessSetup, showDetailed);
    }
  };

  const calculateCashTotal = () => {
      return Object.entries(cashDenominations).reduce((sum, [denom, count]) => {
          return sum + (parseInt(denom) * count);
      }, 0);
  };

  const handleDenominationChange = (denom: string, value: string) => {
      const count = parseInt(value) || 0;
      setCashDenominations(prev => ({ ...prev, [denom]: count }));
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const calculatedCash = calculateCashTotal();
  const systemCash = report.totalCash;
  const cashDifference = calculatedCash - systemCash;

  const enteredMpesa = parseFloat(mpesaTotalInput) || 0;
  const systemMpesa = report.totalMpesa;
  const mpesaDifference = enteredMpesa - systemMpesa;

  return (
    <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg shadow">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <button onClick={() => setCurrentPage('pos')} className="text-gray-600 hover:text-gray-800">
                &larr; Back to POS
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Closing Report</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Detailed Report</label>
                  <input
                    type="checkbox"
                    checked={showDetailed}
                    onChange={(e) => setShowDetailed(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                 onClick={() => setReconciliationVisible(!reconciliationVisible)}
                 className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                  <Briefcase size={18} />
                  <span>{reconciliationVisible ? 'Hide Rec.' : 'Reconcile'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer size={18} />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reconciliation Section */}
        {reconciliationVisible && (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-purple-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Cashier Reconciliation</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Cash Notes & Coins */}
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-3">Cash Breakdown</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {['1000', '500', '200', '100', '50', '40', '20', '10', '5', '1'].map((denom) => (
                                <div key={denom} className="flex items-center space-x-2">
                                    <span className="w-12 text-sm font-medium text-gray-600">{denom}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                                        value={cashDenominations[denom as keyof typeof cashDenominations] || ''}
                                        onChange={(e) => handleDenominationChange(denom, e.target.value)}
                                    />
                                    <span className="w-16 text-xs text-gray-500 text-right">
                                        {(parseInt(denom) * (cashDenominations[denom as keyof typeof cashDenominations] || 0)).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-2 border-t flex justify-between items-center font-bold">
                            <span>Total Counted Cash:</span>
                            <span className="text-lg">Ksh {calculatedCash.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Summary & Differences */}
                    <div>
                         <h3 className="font-semibold text-gray-700 mb-3">Reconciliation Summary</h3>

                         <div className="space-y-4">
                             <div className="bg-gray-50 p-4 rounded-lg">
                                 <div className="flex justify-between mb-2">
                                     <span className="text-gray-600">System Expected Cash:</span>
                                     <span className="font-semibold">Ksh {systemCash.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between mb-2">
                                     <span className="text-gray-600">Actual Counted Cash:</span>
                                     <span className="font-semibold text-blue-600">Ksh {calculatedCash.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between pt-2 border-t">
                                     <span className="font-bold text-gray-800">Difference:</span>
                                     <span className={`font-bold ${cashDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                         {cashDifference > 0 ? '+' : ''}{cashDifference.toLocaleString()}
                                     </span>
                                 </div>
                             </div>

                             <div className="bg-gray-50 p-4 rounded-lg">
                                 <h4 className="text-sm font-semibold text-gray-700 mb-2">M-Pesa Verification</h4>
                                 <div className="flex items-center space-x-2 mb-2">
                                     <span className="text-sm text-gray-600 w-24">Entered Total:</span>
                                     <input
                                        type="number"
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                        placeholder="Enter M-Pesa Total"
                                        value={mpesaTotalInput}
                                        onChange={(e) => setMpesaTotalInput(e.target.value)}
                                     />
                                 </div>
                                 <div className="flex justify-between mb-2">
                                     <span className="text-gray-600">System Expected:</span>
                                     <span className="font-semibold">Ksh {systemMpesa.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between pt-2 border-t">
                                     <span className="font-bold text-gray-800">Difference:</span>
                                     <span className={`font-bold ${mpesaDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                         {mpesaDifference > 0 ? '+' : ''}{mpesaDifference.toLocaleString()}
                                     </span>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* Report Content */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg printable-area">
          {/* Report Header */}
          <div className="text-center mb-8 border-b pb-4">
            <h2 className="text-3xl font-bold">{businessSetup?.businessName || 'WHIZ POS'}</h2>
            <p className="text-gray-600">End of Day Report for {new Date(selectedDate).toDateString()}</p>
          </div>

          {/* Cashier Breakdown - Conditionally Rendered */}
          {showDetailed && report.cashiers.map((cashier) => (
            <div key={cashier.cashierName} className="mb-8 last:mb-0">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="text-xl font-semibold flex items-center">
                  <User className="mr-2 text-blue-500" />
                  Cashier: {cashier.cashierName}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2"><Hash size={14} className="inline mr-1" />Receipt ID</th>
                      <th className="text-left p-2"><Clock size={14} className="inline mr-1" />Time</th>
                      <th className="text-left p-2"><Briefcase size={14} className="inline mr-1" />Payment Mode</th>
                      <th className="text-left p-2"><User size={14} className="inline mr-1" />Credit Customer</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashier.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b">
                        <td className="p-2 font-mono">{tx.id.slice(-6)}</td>
                        <td className="p-2">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2 capitalize">{tx.paymentMethod}</td>
                        <td className="p-2">{tx.creditCustomer || 'N/A'}</td>
                        <td className="text-right p-2 font-semibold">Ksh. {tx.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cashier Totals */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-800 font-bold">CASH</p>
                  <p className="font-semibold text-blue-900">Ksh. {cashier.cashTotal.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-purple-800 font-bold">MPESA</p>
                  <p className="font-semibold text-purple-900">Ksh. {cashier.mpesaTotal.toFixed(2)}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-orange-800 font-bold">CREDIT</p>
                  <p className="font-semibold text-orange-900">Ksh. {cashier.creditTotal.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-800 font-bold">TOTAL</p>
                  <p className="font-semibold text-green-900">Ksh. {cashier.totalSales.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Grand Totals */}
          <div className="mt-12 border-t-2 pt-6">
            <h3 className="text-2xl font-bold text-center mb-4">Grand Totals for the Day</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-100 p-4 rounded-lg">
                <p className="text-sm font-bold text-blue-800">TOTAL CASH</p>
                <p className="text-xl font-extrabold text-blue-900">Ksh. {report.totalCash.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <p className="text-sm font-bold text-purple-800">TOTAL MPESA</p>
                <p className="text-xl font-extrabold text-purple-900">Ksh. {report.totalMpesa.toFixed(2)}</p>
              </div>
              <div className="bg-orange-100 p-4 rounded-lg">
                <p className="text-sm font-bold text-orange-800">TOTAL CREDIT</p>
                <p className="text-xl font-extrabold text-orange-900">Ksh. {report.totalCredit.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <p className="text-sm font-bold text-green-800">GRAND TOTAL</p>
                <p className="text-xl font-extrabold text-green-900">Ksh. {report.grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
