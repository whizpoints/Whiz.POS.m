import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  variance: number;
  type: string;
  reference: string;
  timestamp: string;
  cashierName?: string;
  reason?: string;
}

const SyncHistoryPage = () => {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debugRaw, setDebugRaw] = useState<string>('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (window.electron) {
        const response = await window.electron.readData('inventory-logs.json');
        setDebugRaw(JSON.stringify(response, null, 2));
        if (response && response.data) {
          // Sort descending by timestamp or simply reverse the array since newer are usually appended
          const sorted = (response.data as InventoryLog[]).sort((a, b) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          setLogs(sorted);
        }
      }
    } catch (error) {
      console.error('Failed to load inventory logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    
    // Auto-refresh every 5 seconds for real-time debugging
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <History className="w-8 h-8 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Sync & Calculation History</h1>
              <p className="text-gray-600">Real-time monitor of all local and server-synced stock math</p>
            </div>
          </div>
          <button 
            onClick={loadLogs}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Now</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products, references, or event types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance Math</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => {
                  const variance = Number(log.variance || 0);
                  const isPositive = variance > 0;
                  const isNegative = variance < 0;
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {log.productName || 'Unknown Product'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          log.type?.includes('SALE') ? 'bg-purple-100 text-purple-800' :
                          log.type?.includes('UP') || log.type === 'in' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2 font-mono">
                          <span className="text-gray-400" title="Old Stock">
                            ({log.oldStock ?? '?'})
                          </span>
                          <span className={`flex items-center font-bold ${
                            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : isNegative ? <ArrowDownRight className="w-3 h-3 mr-1" /> : null}
                            {variance > 0 ? '+' : ''}{variance}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.reference || log.reason || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {loading ? 'Loading logs...' : 'No calculation logs found.'}
                <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs font-mono overflow-auto max-h-48 text-gray-800 break-all whitespace-pre-wrap">
                  <strong>Raw Debug Response from Database:</strong><br />
                  {debugRaw || 'No response received from electron.readData()'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncHistoryPage;
