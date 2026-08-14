import { useEffect, useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock, Smartphone, Server } from 'lucide-react';

interface ConnectedDevice {
    ip: string;
    name: string;
    lastSeen: string;
}

interface SyncOperation {
  id: string;
  type: 'transaction' | 'customer' | 'expense' | 'user';
  data: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
}

export default function SyncEngine() {
  const { 
    isOnline, 
    syncQueue, 
    lastSyncTime, 
    processSyncQueue, 
    setOnlineStatus,
    addToSyncQueue,
    transactions,
    creditCustomers,
    expenses,
    users
  } = usePosStore();

  const [syncHistory, setSyncHistory] = useState<SyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [apiConfig, setApiConfig] = useState<{ apiUrl: string, apiKey: string } | null>(null);

  useEffect(() => {
      const loadConfig = async () => {
          if (window.electron && window.electron.getApiConfig) {
              const config = await window.electron.getApiConfig();
              setApiConfig(config);
          }
      };
      loadConfig();

      const fetchDevices = async () => {
          if (window.electron && window.electron.getConnectedDevices) {
              const devices = await window.electron.getConnectedDevices();
              setConnectedDevices(devices);
          }
      };

      fetchDevices();
      const deviceInterval = setInterval(fetchDevices, 30000); // Check every 30s
      return () => clearInterval(deviceInterval);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        handleAutoSync();
      }, 5000); // Wait 5 seconds after coming online

      return () => clearTimeout(timer);
    }
  }, [isOnline, syncQueue.length, isSyncing]);

  // Periodic sync (every 15 minutes)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      handleAutoSync();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [isOnline]);

  const handleAutoSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      await processSyncQueue();
      setSyncProgress(100);
      
      // Add to sync history
      const syncOperation: SyncOperation = {
        id: `SYNC${Date.now()}`,
        type: 'transaction',
        data: { itemsSynced: syncQueue.length },
        timestamp: new Date().toISOString(),
        status: 'completed',
        retryCount: 0
      };
      
      setSyncHistory(prev => [syncOperation, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Auto sync failed:', error);
      
      const failedOperation: SyncOperation = {
        id: `SYNC${Date.now()}`,
        type: 'transaction',
        data: { error: error.message },
        timestamp: new Date().toISOString(),
        status: 'failed',
        retryCount: 1
      };
      
      setSyncHistory(prev => [failedOperation, ...prev.slice(0, 9)]);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgress(0), 2000);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;

    // Add all local data to sync queue
    transactions.forEach(transaction => {
      addToSyncQueue({
        type: 'transaction',
        data: transaction,
        timestamp: transaction.timestamp
      });
    });

    creditCustomers.forEach(customer => {
      addToSyncQueue({
        type: 'customer',
        data: customer,
        timestamp: customer.lastUpdated
      });
    });

    expenses.forEach(expense => {
      addToSyncQueue({
        type: 'expense',
        data: expense,
        timestamp: expense.timestamp
      });
    });

    users.forEach(user => {
      addToSyncQueue({
        type: 'user',
        data: user,
        timestamp: user.createdAt
      });
    });

    await handleAutoSync();
  };

  const getSyncStats = () => {
    const pending = syncQueue.length;
    const completed = syncHistory.filter(op => op.status === 'completed').length;
    const failed = syncHistory.filter(op => op.status === 'failed').length;
    const total = pending + completed + failed;

    return { pending, completed, failed, total };
  };

  const stats = getSyncStats();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-2">
                <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin text-blue-600' : 'text-gray-600'}`} />
                <h1 className="text-2xl font-bold text-gray-800">Sync Status</h1>
              </div>
            </div>
            <button
              onClick={() => { usePosStore.getState().syncFromServer(); }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mr-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Pull Updates</span>
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Push Local Data</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="w-5 h-5" />
                    <span className="font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5" />
                    <span className="font-medium">Offline</span>
                  </>
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                <div>Last Sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}</div>
                <div>Auto-sync: Every 15 minutes</div>
              </div>
            </div>

            {isSyncing && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-600 font-medium">Syncing... {syncProgress}%</span>
              </div>
            )}
          </div>

          {/* Mobile Server Configuration */}
          <div className="border-t pt-4 grid md:grid-cols-2 gap-6">
             <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" /> Desktop Server Config
                </h3>
                {apiConfig ? (
                    <div className="space-y-2 bg-gray-50 p-3 rounded text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Server URL:</span>
                            <span className="font-mono font-medium select-all">{apiConfig.apiUrl}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">API Key:</span>
                            <span className="font-mono font-medium select-all blur-sm hover:blur-none transition-all">{apiConfig.apiKey}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Use these details to connect the Mobile App.</p>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 italic">Loading configuration...</div>
                )}
             </div>

             <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Connected Devices
                </h3>
                {connectedDevices.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {connectedDevices.map((device, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="font-medium text-gray-700">{device.name}</span>
                                </div>
                                <span className="text-xs text-gray-500">{device.ip}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded">No devices connected recently.</div>
                )}
             </div>
          </div>
        </div>

        {/* Sync Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Operations</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sync Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <div className="mt-2 text-center text-sm text-gray-600">
              {syncProgress}% Complete
            </div>
          </div>
        )}

        {/* Sync History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Recent Sync Operations</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Time</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Details</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Retries</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((operation) => (
                  <tr key={operation.id} className="border-b">
                    <td className="py-3 px-6">
                      <div>
                        <div className="text-sm text-gray-800">
                          {new Date(operation.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(operation.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <span className="capitalize">{operation.type}</span>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                        operation.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : operation.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {operation.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {operation.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                        <span className="capitalize">{operation.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {operation.data.itemsSynced ? `${operation.data.itemsSynced} items` : 
                       operation.data.error ? 'Sync error' : 'Data sync'}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`text-sm ${
                        operation.retryCount > 0 ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>
                        {operation.retryCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {syncHistory.length === 0 && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No sync history available</p>
                <p className="text-sm text-gray-400 mt-2">Sync operations will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Offline Information */}
        {!isOnline && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <WifiOff className="w-6 h-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Offline Mode</h3>
                <p className="text-yellow-700 mb-3">
                  You're currently offline. All transactions and data changes are being saved locally and will sync automatically when you're back online.
                </p>
                <div className="space-y-2 text-sm text-yellow-700">
                  <div>• {stats.pending} items pending sync</div>
                  <div>• Data is stored securely on your device</div>
                  <div>• Sync will resume automatically when online</div>
                  <div>• You can continue using all POS features</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
