import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { User } from '../types';
import QRCode from 'qrcode';
import { 
  Settings, 
  Users, 
  Package, 
  Database, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  RefreshCw,
  Building,
  Phone,
  Mail,
  Receipt,
  Keyboard,
  QrCode,
  X,
  Smartphone,
  Monitor,
  Printer,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

export default function SettingsPage() {
  const { 
    businessSetup, 
    users, 
    saveBusinessSetup,
    addUser,
    updateUser,
    deleteUser,
    isOnline,
    lastSyncTime,
    processSyncQueue,
    pushDataToServer,
    archiveTransactions,
    deleteTransactions,
    transactions,
    categories,
    addCategory,
    deleteCategory
  } = usePosStore();

  const [activeTab, setActiveTab] = useState<'business' | 'categories' | 'security' | 'devices' | 'printers' | 'updates' | 'data'>('business');
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [pruneDays, setPruneDays] = useState(30);
  const [deleteDateRange, setDeleteDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Confirmation Dialog States
  const [confirmDialogState, setConfirmDialogState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const [businessData, setBusinessData] = useState({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    receiptFooter: '',
    apiUrl: '',
    apiKey: '',
    servedByLabel: '',
    mpesaPaybill: '',
    mpesaTill: '',
    mpesaAccountNumber: '',
    mongoDbUri: '',
    onScreenKeyboard: false,
    autoLogoffEnabled: false,
    autoLogoffMinutes: 5,
    printerPaperWidth: 80,
    disableReceiptPrinting: false,
  });

  const [userData, setUserData] = useState({
    name: '',
    pin: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    isActive: true
  });

  const [newCategory, setNewCategory] = useState('');
  const [apiConfig, setApiConfig] = useState<{ apiUrl: string, apiKey: string, qrCodeDataUrl: string } | null>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    if (businessSetup) {
      setBusinessData({
        businessName: businessSetup.businessName || '',
        address: businessSetup.address || '',
        phone: businessSetup.phone || '',
        email: businessSetup.email || '',
        receiptFooter: businessSetup.receiptFooter || '',
        apiUrl: businessSetup.apiUrl || '',
        apiKey: businessSetup.apiKey || '',
        servedByLabel: businessSetup.servedByLabel || '',
        mpesaPaybill: businessSetup.mpesaPaybill || '',
        mpesaTill: businessSetup.mpesaTill || '',
        mpesaAccountNumber: businessSetup.mpesaAccountNumber || '',
        mongoDbUri: businessSetup.mongoDbUri || '',
        onScreenKeyboard: businessSetup.onScreenKeyboard || false,
        autoLogoffEnabled: businessSetup.autoLogoffEnabled || false,
        autoLogoffMinutes: businessSetup.autoLogoffMinutes || 5,
        printerPaperWidth: businessSetup.printerPaperWidth || 80,
        disableReceiptPrinting: (businessSetup as any).disableReceiptPrinting || false,
      });
    }
  }, [businessSetup]);

  useEffect(() => {
      if(activeTab === 'devices' && window.electron && window.electron.getApiConfig) {
          window.electron.getApiConfig().then(setApiConfig);
      }
      if(activeTab === 'printers' && window.electron) {
        if(window.electron.getPrinters) {
            window.electron.getPrinters().then(setPrinters);
        }
        if(window.electron.getPrinterSettings) {
            window.electron.getPrinterSettings().then(settings => {
                if(settings && settings.defaultPrinter) setSelectedPrinter(settings.defaultPrinter);
            });
        }
      }
  }, [activeTab]);

  const handleSavePrinter = async () => {
    if(window.electron && window.electron.savePrinterSettings) {
        await window.electron.savePrinterSettings({ defaultPrinter: selectedPrinter });
        alert('Printer settings saved!');
    }
  };

  const handleSaveBusiness = () => {
    saveBusinessSetup({ ...businessSetup, ...businessData, isSetup: true } as any);
    setEditingBusiness(false);
  };

  const handleBusinessDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBusinessData({ ...businessData, [e.target.name]: e.target.value });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'info' = 'danger') => {
      setConfirmDialogState({
          isOpen: true,
          title,
          description,
          onConfirm,
          variant
      });
  };

  const handleArchive = async () => {
        try {
            await archiveTransactions(pruneDays);
            alert('Data archived successfully.');
        } catch (e) {
            console.error(e);
            alert('Failed to archive data.');
        }
  };

  const handleDeleteRange = () => {
        if (!deleteDateRange.start || !deleteDateRange.end) {
            alert("Invalid date range.");
            return;
        }
        const start = new Date(deleteDateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(deleteDateRange.end);
        end.setHours(23, 59, 59, 999);
        const todayStr = new Date().toLocaleDateString('en-CA');

        const idsToDelete = transactions.filter(tx => {
            const txDate = new Date(tx.timestamp);
            const txDateStr = txDate.toLocaleDateString('en-CA');
            if (txDate < start || txDate > end) return false;
            if (txDateStr === todayStr) return false;
            return true;
        }).map(tx => tx.id);

        if (idsToDelete.length === 0) {
            alert("No eligible receipts found. Note: Today's receipts cannot be deleted.");
            return;
        }

        showConfirm(
            "Delete Receipts",
            `Found ${idsToDelete.length} receipts to delete. This is PERMANENT and cannot be undone. Proceed?`,
            () => {
                deleteTransactions(idsToDelete);
                alert(`${idsToDelete.length} receipts deleted.`);
            }
        );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
              <p className="text-gray-600">Manage your business, users, and connections</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'business' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Package className="w-5 h-5 mr-2" />
              Business
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Categories
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Shield className="w-5 h-5 mr-2" />
              Security
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'devices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Connected Devices
            </button>



            <button
              onClick={() => setActiveTab('printers')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'printers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Printer className="w-5 h-5 mr-2" />
              Printers
            </button>

            <button
              onClick={() => setActiveTab('updates')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'updates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Updates
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Database className="w-5 h-5 mr-2" />
              Data
            </button>
          </div>
        </div>

        {/* Category Settings */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
                <Package className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Product Categories</h2>
            </div>

            <div className="max-w-xl">
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 p-3 border rounded-lg"
                />
                <button
                  onClick={() => {
                    if (newCategory.trim()) {
                      addCategory(newCategory.trim());
                      setNewCategory('');
                    }
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <span className="font-medium text-gray-700">{category}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${category}"? Products in this category will remain but their category label will be unchanged.`)) {
                          deleteCategory(category);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Business Settings */}
        {activeTab === 'business' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Business Details</h2>
              {!editingBusiness ? (
                <button onClick={() => setEditingBusiness(true)} className="flex items-center text-blue-600 hover:text-blue-800">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
              ) : (
                <button onClick={handleSaveBusiness} className="flex items-center text-green-600 hover:text-green-800">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input type="text" name="businessName" value={businessData.businessName} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input type="text" name="address" value={businessData.address} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input type="text" name="phone" value={businessData.phone} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <Receipt className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input type="email" name="email" value={businessData.email} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Receipt Footer</label>
                <textarea name="receiptFooter" value={businessData.receiptFooter} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" rows={3}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">"Served By" Label</label>
                <input type="text" name="servedByLabel" value={businessData.servedByLabel} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">M-Pesa Paybill</label>
                <input type="text" name="mpesaPaybill" value={businessData.mpesaPaybill} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">M-Pesa Till</label>
                <input type="text" name="mpesaTill" value={businessData.mpesaTill} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">M-Pesa Account Number</label>
                <input type="text" name="mpesaAccountNumber" value={businessData.mpesaAccountNumber} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
              </div>
               <div className="md:col-span-2">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className='flex items-center'>
                        <Keyboard className="w-5 h-5 mr-2 text-gray-600" />
                        <div>
                            <label htmlFor="onScreenKeyboard" className="block text-sm font-medium text-gray-700">On-Screen Keyboard</label>
                            <p className="text-xs text-gray-500">Enable virtual keyboard for touchscreens</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{businessData.onScreenKeyboard ? 'Enabled' : 'Disabled'}</span>
                        <button
                            onClick={() => {
                                const newVal = !businessData.onScreenKeyboard;
                                setBusinessData(prev => ({ ...prev, onScreenKeyboard: newVal }));
                                saveBusinessSetup({ ...businessSetup, ...businessData, onScreenKeyboard: newVal, isSetup: true } as any);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${businessData.onScreenKeyboard ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${businessData.onScreenKeyboard ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
                </div>
               <div className="md:col-span-2">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className='flex items-center'>
                        <Database className="w-5 h-5 mr-2 text-gray-600" />
                        <div>
                            <label className="block text-sm font-medium text-gray-700">KRA eTIMS Integration (Web Portal)</label>
                            <p className="text-xs text-gray-500">Enable fetching KRA VSCU invoices from backend API</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{businessData.kraEnabled ? 'Enabled' : 'Disabled'}</span>
                        <button
                            onClick={() => {
                                const newVal = !businessData.kraEnabled;
                                setBusinessData(prev => ({ ...prev, kraEnabled: newVal }));
                                saveBusinessSetup({ ...businessSetup, ...businessData, kraEnabled: newVal, isSetup: true } as any);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${businessData.kraEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${businessData.kraEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings (Auto Logoff) */}
        {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-orange-600" />
                    <h2 className="text-xl font-bold text-gray-800">Security & Session</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Manage session timeouts and access security.
                </p>

                <div className="space-y-6 max-w-xl">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-gray-600" />
                                <div>
                                    <h3 className="font-medium text-gray-800">Auto Log Off</h3>
                                    <p className="text-xs text-gray-500">Automatically log out inactive users</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">{businessData.autoLogoffEnabled ? 'Enabled' : 'Disabled'}</span>
                                <button
                                    onClick={() => {
                                        const newVal = !businessData.autoLogoffEnabled;
                                        setBusinessData(prev => ({ ...prev, autoLogoffEnabled: newVal }));
                                        saveBusinessSetup({ ...businessSetup, ...businessData, autoLogoffEnabled: newVal, isSetup: true } as any);
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${businessData.autoLogoffEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${businessData.autoLogoffEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        {businessData.autoLogoffEnabled && (
                            <div className="mt-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Idle Time (Minutes)</label>
                                <div className="flex gap-4">
                                    {[1, 2, 5, 10, 30, 60].map(mins => (
                                        <button
                                            key={mins}
                                            onClick={() => {
                                                setBusinessData(prev => ({ ...prev, autoLogoffMinutes: mins }));
                                                saveBusinessSetup({ ...businessSetup, ...businessData, autoLogoffMinutes: mins, isSetup: true } as any);
                                            }}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                                                businessData.autoLogoffMinutes === mins
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {mins}m
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <label className="text-xs text-gray-500">Custom (min):</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={businessData.autoLogoffMinutes}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setBusinessData(prev => ({ ...prev, autoLogoffMinutes: val }));
                                            saveBusinessSetup({ ...businessSetup, ...businessData, autoLogoffMinutes: val, isSetup: true } as any);
                                        }}
                                        className="ml-2 w-20 px-2 py-1 text-sm border rounded"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Data Management */}
        {activeTab === 'data' && (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Data Management</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Manage storage and optimize performance by archiving old data.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-xl mb-6">
                    <h3 className="font-bold text-red-800 mb-2">Archive Old Receipts (Preserve Stats)</h3>
                    <p className="text-sm text-red-700 mb-4">
                        This operation will delete transaction details older than the specified number of days but <strong>preserves sales totals</strong> in daily summaries.
                    </p>

                    <div className="flex items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Older than (days)</label>
                            <input
                                type="number"
                                min="1"
                                value={pruneDays}
                                onChange={(e) => setPruneDays(Math.max(1, parseInt(e.target.value) || 1))}
                                className="p-3 border rounded-lg bg-white w-32"
                            />
                        </div>
                        <button
                            onClick={() => {
                                showConfirm(
                                    "Archive Receipts",
                                    `Are you sure you want to archive receipts older than ${pruneDays} days? Details will be lost but stats kept.`,
                                    handleArchive
                                );
                            }}
                            className="flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-sm transition-colors mb-[1px]"
                        >
                            <Trash2 className="w-5 h-5 mr-2" />
                            Archive
                        </button>
                    </div>
                </div>

                <div className="bg-red-100 border border-red-300 rounded-lg p-6 max-w-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-700" />
                        <h3 className="font-bold text-red-800">Delete Receipts (Permanent)</h3>
                    </div>
                    <p className="text-sm text-red-700 mb-4">
                        Permanently delete receipts within a specific date range. <strong>This cannot be undone.</strong> Today's receipts cannot be deleted.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                value={deleteDateRange.start}
                                onChange={(e) => setDeleteDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                value={deleteDateRange.end}
                                onChange={(e) => setDeleteDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleDeleteRange}
                        className="w-full flex items-center justify-center bg-red-700 hover:bg-red-800 text-white px-6 py-3 rounded-lg shadow-sm transition-colors"
                    >
                        <Trash2 className="w-5 h-5 mr-2" />
                        Delete Specific Range
                    </button>
                </div>
            </div>
        )}

        {/* Devices & Connection */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-800">Mobile App Connection</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Scan this QR code with the Mobile App to connect to this Desktop POS for printing and syncing.
                </p>

                {apiConfig ? (
                    <div className="flex flex-col md:flex-row gap-8 items-center bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <img src={apiConfig.qrCodeDataUrl} alt="Connection QR Code" className="w-48 h-48" />
                        </div>
                        <div className="flex-1 space-y-6 w-full">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Desktop Server URL</label>
                                <div className="flex items-center gap-2 mt-1">
                                <code className="block w-full bg-white px-4 py-3 rounded-lg border border-gray-300 text-sm font-mono text-gray-800 shadow-sm">
                                    {apiConfig.apiUrl}
                                </code>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Enter this exactly into the Mobile App.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mobile Sync Key</label>
                                <div className="flex items-center gap-2 mt-1">
                                <code className="block w-full bg-white px-4 py-3 rounded-lg border border-gray-300 text-sm font-mono text-gray-800 break-all shadow-sm">
                                    {apiConfig.apiKey}
                                </code>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">This key secures the connection between Mobile and Desktop.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Generating secure connection credentials...</p>
                        <p className="text-xs text-gray-400 mt-2">Please ensure the app is running in Desktop mode.</p>
                    </div>
                )}
              </div>
          </div>
        )}



        {/* Printer Settings */}
        {activeTab === 'printers' && (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Printer className="w-6 h-6 text-gray-700" />
                    <h2 className="text-xl font-semibold text-gray-800">Printer Configuration</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Configure your receipt printer settings.
                </p>

                <div className="max-w-xl space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className='flex items-center'>
                            <Printer className="w-5 h-5 mr-2 text-gray-600" />
                            <div>
                                <label htmlFor="disableReceiptPrinting" className="block text-sm font-medium text-gray-700">Disable Receipt Printing</label>
                                <p className="text-xs text-gray-500">Show a success popup instead of printing receipts</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{businessData.disableReceiptPrinting ? 'Disabled' : 'Enabled'}</span>
                            <button
                                onClick={() => {
                                    const newVal = !businessData.disableReceiptPrinting;
                                    setBusinessData(prev => ({ ...prev, disableReceiptPrinting: newVal }));
                                    saveBusinessSetup({ ...businessSetup, ...businessData, disableReceiptPrinting: newVal, isSetup: true } as any);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${businessData.disableReceiptPrinting ? 'bg-red-600' : 'bg-blue-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${businessData.disableReceiptPrinting ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    {!businessData.disableReceiptPrinting && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Paper Width (mm)</label>
                                <input
                                    type="number"
                                    min="40"
                                    max="120"
                                    value={businessData.printerPaperWidth || 80}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 80;
                                        setBusinessData(prev => ({ ...prev, printerPaperWidth: val }));
                                        saveBusinessSetup({ ...businessSetup, ...businessData, printerPaperWidth: val, isSetup: true } as any);
                                    }}
                                    className="w-full p-3 border rounded-lg bg-white"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Set the width of your thermal paper (e.g., 80mm or 58mm). This ensures the receipt content scales correctly.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Printer</label>
                                <select
                                    value={selectedPrinter}
                                    onChange={(e) => setSelectedPrinter(e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-white"
                                >
                                    <option value="">-- Always Ask (Show Print Dialog) --</option>
                                    {printers.map((p, idx) => (
                                        <option key={idx} value={p.name}>{p.name} {p.isDefault ? '(System Default)' : ''}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    If a printer is selected, receipts will print automatically to it without showing a dialog.
                                </p>
                            </div>

                            <button
                                onClick={handleSavePrinter}
                                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm transition-colors"
                            >
                                <Save className="w-5 h-5 mr-2" />
                                Save Printer Settings
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Update Assistance */}
        {activeTab === 'updates' && (
             <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                    <RefreshCw className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Update Assistance</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Check for the latest version of Whiz POS.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-medium text-gray-700">Current Version:</span>
                        <span className="text-gray-900 font-bold">{window.electron ? 'Desktop App' : 'Web Version'}</span>
                    </div>

                    <button
                        onClick={() => {
                            if (window.electron && window.electron.checkForUpdate) {
                                window.electron.checkForUpdate();
                                alert('Checking for updates...');
                            } else {
                                alert('Update check is only available in the Desktop Application.');
                            }
                        }}
                        className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-sm transition-colors"
                    >
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Check for Updates
                    </button>

                    <p className="text-xs text-gray-500 mt-4 text-center">
                        The application automatically checks for updates in the background every hour.
                    </p>
                </div>
            </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        onCancel={() => setConfirmDialogState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialogState.onConfirm}
        title={confirmDialogState.title}
        description={confirmDialogState.description}
        variant={confirmDialogState.variant}
      />

    </div>
  );
}
