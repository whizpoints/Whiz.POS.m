import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, Download } from 'lucide-react';

export default function MpesaReconciliation() {
  let user: any = {};
  try {
    const uStr = localStorage.getItem('whiz-user');
    if (uStr && uStr !== 'undefined') user = JSON.parse(uStr);
  } catch(e) {}
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user?.businessId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('businessId', user.businessId);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/reconciliation/mpesa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('whiz-token') || ''}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert('Error reconciling file. Ensure it is a valid Safaricom Excel Statement.');
    } finally {
      setIsUploading(false);
    }
  };

  const generatePDF = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">M-Pesa Reconciliation</h1>
          <p className="text-gray-500">Upload your Safaricom Excel Statement to verify offline M-Pesa sales.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:hidden">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors bg-gray-50">
          <UploadCloud className="w-12 h-12 text-blue-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Excel Statement</h3>
          <p className="text-gray-500 mb-6 max-w-sm">
            Download your statement from the Safaricom portal in .xlsx format and upload it here.
          </p>
          
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden" 
            id="file-upload"
          />
          <label 
            htmlFor="file-upload"
            className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            {file ? file.name : 'Select File'}
          </label>

          {file && (
            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className="mt-4 bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? 'Reconciling...' : 'Run Reconciliation'}
            </button>
          )}
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Reconciliation Results</h2>
            <button 
              onClick={generatePDF}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors print:hidden"
            >
              <Download className="w-4 h-4" /> Export PDF Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase">Excel Records</p>
                <p className="text-3xl font-bold text-gray-900">{results.summary.totalExcelFound}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-600 uppercase">Verified Matches</p>
                <p className="text-3xl font-bold text-gray-900">{results.summary.totalMatched}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600 uppercase">Unmatched POS</p>
                <p className="text-3xl font-bold text-gray-900">{results.unmatchedPos.length}</p>
                <p className="text-xs text-red-500 mt-1">Requires manual audit</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
               Verified Sales (Sample)
             </div>
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-50/50">
                 <tr>
                   <th className="p-4 font-semibold text-gray-600">Receipt No</th>
                   <th className="p-4 font-semibold text-gray-600">Date</th>
                   <th className="p-4 font-semibold text-gray-600">Amount</th>
                   <th className="p-4 font-semibold text-gray-600">Phone</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {results.matched.slice(0, 5).map((m: any, i: number) => (
                   <tr key={i} className="hover:bg-gray-50">
                     <td className="p-4 text-green-600 font-medium">{m.excel.receiptNo}</td>
                     <td className="p-4 text-gray-600">{m.excel.date}</td>
                     <td className="p-4 font-bold">KSh {m.excel.amount}</td>
                     <td className="p-4 text-gray-600">{m.excel.fullPhone}</td>
                   </tr>
                 ))}
                 {results.matched.length === 0 && (
                   <tr><td colSpan={4} className="p-8 text-center text-gray-500">No matches found</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}
