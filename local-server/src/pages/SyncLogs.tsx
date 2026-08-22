import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';

interface SyncLog {
  id: string;
  businessId: string;
  outletId: string | null;
  outletName: string;
  terminal: string | null;
  type: string;
  status: string;
  details: string | null;
  createdAt: string;
}

export default function SyncLogs() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeLocationId } = useBranchContext();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('whiz-token');
      const res = await fetch('/api/sync/delta/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Fetch failed with status:', res.status, 'Response:', errText);
        setLogs([{ id: 'error', terminal: 'Error fetching logs', details: errText } as any]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Sync Logs
          </h1>
          <p className="text-gray-500 mt-1">Real-time monitoring of POS synchronization events.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Terminal / Outlet</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    No sync logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{log.terminal || 'Unknown Terminal'}</div>
                      <div className="text-xs text-gray-500">{log.outletName}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {log.outletId || 'null (Location Level)'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${log.type === 'PULL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-1.5 text-green-600 font-medium">
                          <CheckCircle className="w-4 h-4" /> Success
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-600 font-medium">
                          <XCircle className="w-4 h-4" /> Failed
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-md truncate" title={log.details || ''}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
