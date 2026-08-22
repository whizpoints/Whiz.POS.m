import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { User } from '../types';
import QRCode from 'qrcode';
import { 
  Settings, Users, Package, Database, Plus, Edit, Trash2, Save, RefreshCw,
  Building, Phone, Mail, Receipt, Keyboard, QrCode, X, Smartphone, Monitor,
  Printer, Shield, Clock, AlertTriangle, HardDrive, CreditCard, FileCheck, MessageSquare,
  Server, Link2, Key, LayoutDashboard, Cloud, FileKey, CheckCircle
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { 
    businessSetup, saveBusinessSetup, isOnline, lastSyncTime, processSyncQueue,
    pushDataToServer, archiveTransactions, deleteTransactions, transactions,
    categories, addCategory, deleteCategory, users, products
  } = usePosStore();

  const [activeTab, setActiveTab] = useState<'business' | 'hardware' | 'network' | 'payments' | 'etims' | 'messaging' | 'categories' | 'security' | 'devices' | 'updates' | 'data' | 'cloud'>('business');
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [pruneDays, setPruneDays] = useState(30);
  const [deleteDateRange, setDeleteDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [confirmDialogState, setConfirmDialogState] = useState<{
    isOpen: boolean; title: string; description: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'danger'
  });

  const [businessData, setBusinessData] = useState<any>({});
  const [newCategory, setNewCategory] = useState('');
  const [apiConfig, setApiConfig] = useState<{ apiUrl: string, apiKey: string, qrCodeDataUrl: string } | null>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudUrl, setCloudUrl] = useState('https://api.whizpoint.app');
  const [isVerifyingCloud, setIsVerifyingCloud] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingBusinessData, setPairingBusinessData] = useState<any>(null);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isConfirmingPairing, setIsConfirmingPairing] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);

  const fetchLocations = async () => {
    const key = (businessSetup as any)?.backOfficeApiKey || (businessSetup as any)?.cloudSyncKey;
    const url = (businessSetup as any)?.backOfficeUrl || (businessSetup as any)?.cloudSyncUrl;
    if (!key || !url) return;
    
    setIsFetchingLocations(true);
    try {
      const baseUrl = url.trim().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/business/locations`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocations(data.locations || []);
      } else {
        toast.error('Failed to fetch branches');
      }
    } catch (e) {
      toast.error('Connection error fetching branches.');
    } finally {
      setIsFetchingLocations(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud' && ((businessSetup as any)?.backOfficeApiKey || (businessSetup as any)?.cloudSyncKey)) {
      fetchLocations();
    }
  }, [activeTab]);

  const handleLinkCloud = async () => {
    if (!cloudApiKey || !cloudUrl) return;
    setIsVerifyingCloud(true);
    try {
      const baseUrl = cloudUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/auth/verify-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cloudApiKey })
      });
      const data = await res.json();
      if (res.ok && data.success) {
         setPairingBusinessData(data.business);
         setPairingModalOpen(true);
      } else {
         toast.error('Invalid API Key: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      toast.error('Connection error while linking account.');
    } finally {
      setIsVerifyingCloud(false);
    }
  };

  const handleConfirmPairing = async () => {
    if (!pairingCodeInput) return;
    setIsConfirmingPairing(true);
    try {
      const baseUrl = cloudUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/auth/confirm-pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cloudApiKey, pairingCode: pairingCodeInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
         saveBusinessSetup({ ...businessSetup, backOfficeApiKey: cloudApiKey, backOfficeUrl: baseUrl, businessId: data.businessId, cloudBusinessId: data.businessId, isSetup: true } as any);
         setPairingModalOpen(false);
         setCloudApiKey('');
         setPairingCodeInput('');
      } else {
         toast.error('Invalid Pairing Code: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      toast.error('Connection error while confirming pairing.');
    } finally {
      setIsConfirmingPairing(false);
    }
  };

  const handleForceSync = async () => {
    const key = (businessSetup as any)?.backOfficeApiKey || (businessSetup as any)?.cloudSyncKey;
    const url = (businessSetup as any)?.backOfficeUrl || (businessSetup as any)?.cloudSyncUrl;
    if (!key || !url) return;
    
    setIsSyncingData(true);
    setSyncLogs([`[${new Date().toLocaleTimeString()}] Starting manual cloud sync...`]);
    try {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Pushing products, users, sales, and settings...`]);
      
      // Temporarily inject credentials into businessSetup so pushDataToServer finds them if not saved yet
      if (!businessSetup.backOfficeUrl) {
          saveBusinessSetup({ ...businessSetup, backOfficeUrl: url, backOfficeApiKey: key } as any);
      }

      await pushDataToServer();
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Sync Successful! Check web portal for updates.`]);
    } catch (e: any) {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Network Error: ${e.message}`]);
    } finally {
      setIsSyncingData(false);
    }
  };

  useEffect(() => {
    if (businessSetup) {
      setBusinessData({
        ...businessSetup,
        // Ensure defaults for new Enterprise fields
        cashDrawerMode: businessSetup.cashDrawerMode || 'disabled',
        scaleMode: businessSetup.scaleMode || 'disabled',
        receiptMode: businessSetup.receiptMode || 'auto_print',
        printerChannel: businessSetup.printerChannel || 'usb',
        mpesaEnv: businessSetup.mpesaEnv || 'sandbox',
        cardMode: businessSetup.cardMode || 'standalone',
        cardGateway: businessSetup.cardGateway || 'paystack',
        etimsEnv: businessSetup.etimsEnv || 'sandbox',
        disableReceiptPrinting: (businessSetup as any).disableReceiptPrinting || false,
        onScreenKeyboard: businessSetup.onScreenKeyboard || false,
        autoLogoffEnabled: businessSetup.autoLogoffEnabled || false,
        autoLogoffMinutes: businessSetup.autoLogoffMinutes || 5,
        printerPaperWidth: businessSetup.printerPaperWidth || 80,
        lanAdminIp: businessSetup.lanAdminIp || ''
      });
    }
  }, [businessSetup]);

  useEffect(() => {
      if(activeTab === 'devices' && window.electron && window.electron.getApiConfig) {
          window.electron.getApiConfig().then(setApiConfig);
      }
      if(activeTab === 'hardware' && window.electron) {
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
        toast.success('Printer settings saved!');
    }
  };

  const handleSaveBusiness = () => {
    saveBusinessSetup({ ...businessSetup, ...businessData, isSetup: true } as any);
    setEditingBusiness(false);
  };

  const handleBusinessDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setBusinessData({ ...businessData, [e.target.name]: value });
  };

  const NavTab = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Enterprise Settings</h1>
              <p className="text-gray-600">Modular Configuration Engine</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto custom-scrollbar">
            <NavTab id="business" icon={Building} label="Business" />
            <NavTab id="hardware" icon={HardDrive} label="Hardware & Peripherals" />
            <NavTab id="network" icon={Server} label="Network Server" />
            <NavTab id="categories" icon={Package} label="Categories" />
            <NavTab id="cloud" icon={Cloud} label="Cloud Sync" />
            <NavTab id="updates" icon={RefreshCw} label="Updates" />
          </div>
        </div>

        {/* --- NETWORK SERVER SETTINGS --- */}
        {activeTab === 'network' && (
          <div className="bg-white rounded-lg shadow-sm p-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Local Server Network Settings</h2>
              <button 
                onClick={handleSaveBusiness}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
                <Server className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Auto-Discovery vs Static IP</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    The POS terminal automatically discovers the local Admin Server using mDNS. 
                    If your router blocks multicast traffic and auto-discovery fails, enter the static IP of the Admin Server here.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local Admin Server IP (Fallback)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    name="lanAdminIp"
                    value={businessData.lanAdminIp || ''}
                    onChange={handleBusinessDataChange}
                    placeholder="e.g. http://192.168.1.100:3000"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Leave empty to rely on mDNS Auto-Discovery.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- BUSINESS DETAILS --- */}
        {activeTab === 'business' && (
           <div className="bg-white rounded-lg shadow-sm p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-semibold text-gray-800">Business Details</h2>
               {!editingBusiness ? (
                 <button onClick={() => setEditingBusiness(true)} className="flex items-center text-blue-600 hover:text-blue-800">
                   <Edit className="w-4 h-4 mr-2" /> Edit
                 </button>
               ) : (
                 <button onClick={handleSaveBusiness} className="flex items-center text-green-600 hover:text-green-800">
                   <Save className="w-4 h-4 mr-2" /> Save
                 </button>
               )}
             </div>
 
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Business Name</label>
                   <input type="text" name="businessName" value={businessData.businessName || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Address</label>
                   <input type="text" name="address" value={businessData.address || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                 </div>
               </div>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Phone</label>
                   <input type="text" name="phone" value={businessData.phone || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Email</label>
                   <input type="email" name="email" value={businessData.email || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                 </div>
               </div>

               {/* PAYMENT OPTIONS */}
               <div className="md:col-span-2 pt-4 border-t">
                 <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment Options (Receipt Inject)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700">M-Pesa Paybill</label>
                     <input type="text" name="mpesaPaybill" value={businessData.mpesaPaybill || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} placeholder="e.g. 123456" className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Account Number</label>
                     <input type="text" name="accountNumber" value={businessData.accountNumber || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} placeholder="e.g. Business Name" className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">M-Pesa Till Number</label>
                     <input type="text" name="tillNumber" value={businessData.tillNumber || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} placeholder="e.g. 987654" className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
                   </div>
                 </div>
               </div>

               <div className="md:col-span-2 pt-4 border-t">
                 <label className="block text-sm font-medium text-gray-700">Receipt Footer</label>
                 <textarea name="receiptFooter" value={businessData.receiptFooter || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" rows={3}></textarea>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">"Served By" Label</label>
                 <input type="text" name="servedBy" value={businessData.servedBy || ''} onChange={handleBusinessDataChange} disabled={!editingBusiness} className="w-full p-3 border rounded-lg bg-gray-50 disabled:bg-gray-200" />
               </div>
             </div>
           </div>
        )}

        {/* --- HARDWARE & PERIPHERALS --- */}
        {activeTab === 'hardware' && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><HardDrive className="text-blue-600"/> Hardware & Peripherals</h2>
              <button onClick={handleSaveBusiness} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Save className="w-4 h-4 mr-2" /> Save Changes</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cash Drawer */}
              <div className="bg-gray-50 p-5 rounded-xl border">
                <h3 className="font-bold text-gray-800 mb-4">Cash Drawer Mode</h3>
                <select name="cashDrawerMode" value={businessData.cashDrawerMode} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg bg-white mb-2">
                  <option value="disabled">Disabled / Drawerless</option>
                  <option value="auto_pulse">Auto-Pulse on Cash Sale</option>
                  <option value="manual_only">Manual Manager Button Only</option>
                </select>
                <p className="text-sm text-gray-500">Controls when the cash drawer kick pulse is sent to the printer.</p>
              </div>

              {/* Scale Mode */}
              <div className="bg-gray-50 p-5 rounded-xl border">
                <h3 className="font-bold text-gray-800 mb-4">Digital Scale Mode</h3>
                <select name="scaleMode" value={businessData.scaleMode} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg bg-white mb-2">
                  <option value="disabled">Disabled</option>
                  <option value="manual_input">Manual Weight Input</option>
                  <option value="rs232">USB/Serial Auto-Read (RS232)</option>
                  <option value="barcode_prefix_20">Weight-Embedded Barcode Parser (Prefix 20)</option>
                </select>
                <p className="text-sm text-gray-500">How loose items (produce, meat) are weighed at checkout.</p>
              </div>

              {/* Receipt Printing Mode */}
              <div className="bg-gray-50 p-5 rounded-xl border md:col-span-2">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Printer className="w-5 h-5"/> Receipt Printing Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Print Trigger</label>
                    <select name="receiptMode" value={businessData.receiptMode} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg bg-white">
                      <option value="auto_print">Auto-Print on Sale</option>
                      <option value="print_on_request">Print on Request Only</option>
                      <option value="digital_only">Digital Only (WhatsApp/Email)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Printer Channel</label>
                    <select name="printerChannel" value={businessData.printerChannel} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg bg-white">
                      <option value="usb">USB (Direct)</option>
                      <option value="network">Network (IP/Ethernet)</option>
                      <option value="bluetooth">Bluetooth</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">System Printer</label>
                    <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                        <option value="">-- Always Ask --</option>
                        {printers.map((p, idx) => <option key={idx} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div className='flex items-center'>
                        <Printer className="w-5 h-5 mr-2 text-gray-600" />
                        <div>
                            <label htmlFor="disableReceiptPrinting" className="block text-sm font-medium text-gray-700">Disable Receipt Printing Globally</label>
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
              </div>
            </div>
          </div>
        )}

        

        {/* --- CATEGORIES --- */}
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



        {/* --- UPDATES --- */}
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
                        <span className="text-gray-900 font-bold">{window.electron ? 'Desktop App Enterprise v2.0' : 'Web Version Enterprise v2.0'}</span>
                    </div>

                    <button
                        onClick={() => {
                            if (window.electron && window.electron.checkForUpdate) {
                                window.electron.checkForUpdate();
                                toast.success('Checking for updates...');
                            } else {
                                toast.error('Update check is only available in the Desktop Application.');
                            }
                        }}
                        className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-sm transition-colors"
                    >
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Check for Updates
                    </button>
                </div>
            </div>
        )}

        {/* --- CLOUD SYNC --- */}
        {activeTab === 'cloud' && (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <Cloud className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Web Portal Cloud Sync</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Link this Desktop POS to your cloud Back Office. The Desktop POS is the main source of truth, and your data will be synced up to the cloud.
            </p>

            {(businessSetup as any)?.backOfficeApiKey || (businessSetup as any)?.cloudSyncKey ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-6">
                  <div className="flex items-center gap-3 text-green-700 mb-2">
                    <FileCheck className="w-6 h-6" />
                    <h3 className="font-bold text-lg">Account Linked</h3>
                  </div>
                  <p className="text-green-600 text-sm">Your POS is actively authorized to sync data to the cloud at <strong>{(businessSetup as any)?.backOfficeUrl || (businessSetup as any)?.cloudSyncUrl}</strong>.</p>
                  
                  <div className="mt-6 border-t border-green-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">POS Branch Assignment</label>
                      <button onClick={fetchLocations} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <RefreshCw className={`w-3 h-3 ${isFetchingLocations ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </div>
                    <select
                      value={businessData.locationId || ''}
                      onChange={(e) => {
                        const locId = e.target.value;
                        const locName = locations.find(l => l.id === locId)?.name;
                        const updated = { ...businessSetup, locationId: locId, locationName: locName };
                        saveBusinessSetup(updated as any);
                        setBusinessData(updated);
                        toast.success(`POS Assigned to ${locName || 'Main Branch'}`);
                      }}
                      className="w-full p-2 border rounded bg-white text-sm"
                      disabled={isFetchingLocations}
                    >
                      <option value="">-- Select Branch (Defaults to Main Branch) --</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} {loc.address ? `(${loc.address})` : ''}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select the branch this terminal operates in to sync branch-specific inventory and settings.</p>
                  </div>
                
                <div className="mt-6">
                  <button
                    onClick={handleForceSync}
                    disabled={isSyncingData}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingData ? 'animate-spin' : ''}`} />
                    {isSyncingData ? 'Syncing to Cloud...' : 'Force Sync Data'}
                  </button>
                  
                  {syncLogs.length > 0 && (
                    <div className="mt-4 bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-green-400">
                      {syncLogs.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-green-200">
                  <button 
                    onClick={() => {
                       if (confirm('Are you sure you want to unlink this POS from the cloud?')) {
                          saveBusinessSetup({ ...businessSetup, cloudSyncKey: null, cloudSyncUrl: null, backOfficeApiKey: null, backOfficeUrl: null, cloudBusinessId: null, isSetup: true } as any);
                       }
                    }}
                    className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Unlink Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Back Office URL</label>
                  <input
                    type="text"
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    placeholder="https://api.whizpoint.app"
                    className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">The root URL of your web portal backend.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Web Portal API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={cloudApiKey}
                      onChange={(e) => setCloudApiKey(e.target.value)}
                      placeholder="Paste the 64-character API Key here..."
                      className="flex-1 p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      onClick={handleLinkCloud}
                      disabled={isVerifyingCloud || !cloudApiKey || !cloudUrl}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors whitespace-nowrap"
                    >
                      {isVerifyingCloud ? 'Linking...' : 'Link Account'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You can find this key by logging into your web portal dashboard.</p>
                </div>
              </div>
            )}

            {/* Pairing Code Modal Overlay */}
            {pairingModalOpen && pairingBusinessData && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center text-white relative">
                     <button onClick={() => setPairingModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
                       <X className="w-5 h-5" />
                     </button>
                     <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                       <Shield className="w-8 h-8" />
                     </div>
                     <h3 className="text-2xl font-bold mb-1">Verify Device</h3>
                     <p className="text-blue-100 text-sm">Enter the 2FA pairing code to confirm linkage</p>
                  </div>
                  
                  <div className="p-6">
                     <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                       <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-200/60">
                         <Building className="w-4 h-4 text-gray-400" />
                         <span className="text-sm font-medium text-gray-700">{pairingBusinessData.name}</span>
                       </div>
                       <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-200/60">
                         <Mail className="w-4 h-4 text-gray-400" />
                         <span className="text-sm text-gray-600 truncate">{pairingBusinessData.adminEmail}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <FileKey className="w-4 h-4 text-gray-400" />
                         <span className="text-xs text-gray-500 font-mono truncate">{pairingBusinessData.id}</span>
                       </div>
                     </div>

                     <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-semibold text-gray-800 mb-2 text-center">Enter 6-Digit Pairing Code</label>
                         <input
                           type="text"
                           maxLength={6}
                           value={pairingCodeInput}
                           onChange={(e) => setPairingCodeInput(e.target.value.replace(/\D/g, ''))}
                           placeholder="------"
                           className="w-full text-center text-3xl tracking-[0.5em] font-mono p-4 border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                         />
                         <p className="text-xs text-gray-500 mt-3 text-center">You can generate this code on the Web Portal Security Page.</p>
                       </div>
                       
                       <button
                         onClick={handleConfirmPairing}
                         disabled={isConfirmingPairing || pairingCodeInput.length !== 6}
                         className="w-full bg-blue-600 text-white font-semibold text-lg py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                       >
                         {isConfirmingPairing ? (
                           <><RefreshCw className="w-5 h-5 animate-spin" /> Verifying...</>
                         ) : (
                           <><CheckCircle className="w-5 h-5" /> Pair Device</>
                         )}
                       </button>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
