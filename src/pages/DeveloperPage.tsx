import React, { useState, useEffect, useRef } from 'react';
import { usePosStore } from '../store/posStore';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Shield, Save, CheckCircle, AlertTriangle, Key, Globe, Copy, RefreshCw, FileText, Download, Lock, HardDrive, Database, Printer, Smartphone, Delete, X, ArrowLeft, LogOut, Settings, Eye, EyeOff, CreditCard, FileCheck, MessageSquare, Trash2, Clock, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';
const DeveloperPage = () => {
    const { businessSetup, saveBusinessSetup, archiveTransactions, deleteTransactions, transactions } = usePosStore();
    const navigate = useNavigate();

    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [authError, setAuthError] = useState('');
    const [activeMenu, setActiveMenu] = useState('general');
    const inputRef = useRef<HTMLInputElement>(null);

    // Configuration State
    const [isLoading, setIsLoading] = useState(true);
    const [backOfficeUrl, setBackOfficeUrl] = useState('');
    const [backOfficeApiKey, setBackOfficeApiKey] = useState('');
    const [locationId, setLocationId] = useState('');
    const [outletId, setOutletId] = useState('');
    const [outletName, setOutletName] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [showDevFooter, setShowDevFooter] = useState(true);
    const [isPushing, setIsPushing] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    
    // Extracted Secure Settings State
    const [businessData, setBusinessData] = useState<any>({});
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

    // M-Pesa State
    const [mpesaConfig, setMpesaConfig] = useState({
        enabled: false,
        backendUrl: '',
        apiKey: '',
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        shortcode: '',
        partyB: '',
        initiatorName: '',
        initiatorPassword: '',
        callbackUrl: '',
        type: 'Till' as 'Paybill' | 'Till',
        environment: 'Production' as 'Sandbox' | 'Production'
    });

    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
    const togglePasswordVisibility = (field: string) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const [logs, setLogs] = useState('');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Hardware State
    const [isScanning, setIsScanning] = useState(false);
    const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);

    useEffect(() => {
        if (isAuthenticated) {
            loadConfig();
        }
    }, [isAuthenticated, businessSetup]);

    useEffect(() => {
        if (businessSetup) {
            setBusinessData({
                ...businessSetup,
                mpesaEnv: businessSetup.mpesaEnv || 'sandbox',
                cardMode: businessSetup.cardMode || 'standalone',
                cardGateway: businessSetup.cardGateway || 'paystack',
                etimsEnv: businessSetup.etimsEnv || 'sandbox',
                autoLogoffEnabled: businessSetup.autoLogoffEnabled || false,
                autoLogoffMinutes: businessSetup.autoLogoffMinutes || 5,
                onScreenKeyboard: businessSetup.onScreenKeyboard || false,
            });
        }
    }, [businessSetup]);

    useEffect(() => {
        if (!isAuthenticated && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAuthenticated, pin]);

    const hashPin = async (rawPin: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(rawPin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleKeyPress = (key: string) => {
        if (key === 'clear') {
            setPin('');
            setAuthError('');
        } else if (key === 'delete') {
            setPin(prev => prev.slice(0, -1));
            setAuthError('');
        } else if (key === 'enter') {
            handleLogin();
        } else {
            setPin(prev => prev + key);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key >= '0' && e.key <= '9') {
            handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
            handleKeyPress('delete');
        } else if (e.key === 'Enter') {
            handleKeyPress('enter');
        } else if (e.key === 'Escape') {
            handleKeyPress('clear');
        }
    };

    const handleLogin = async (explicitPin?: string) => {
        const loginPin = explicitPin || pin;
        const defaultHash = '47d90172f4b2df4a520e7015ab5f34fae90716ba83f6ffa158224fd7d629e0b0';
        const storedPin = businessSetup?.developerPin || defaultHash;
        
        const hashedLoginPin = await hashPin(loginPin);
        
        // Backward compatibility in case the user previously changed their pin to plaintext 
        // before we introduced hashing. If it's 64 chars it's a hash, otherwise treat as plain.
        const isLegacyPlaintext = storedPin.length !== 64 && storedPin !== defaultHash;
        const isValid = isLegacyPlaintext ? (loginPin === storedPin) : (hashedLoginPin === storedPin);

        if (isValid) {
            setIsAuthenticated(true);
            setAuthError('');
        } else {
            setAuthError('Invalid Access Code');
            setPin('');
        }
    };

    const loadConfig = async () => {
        try {
            let config: any = {};
            if (window.electron && window.electron.readData) {
                const configData = await window.electron.readData('business-setup.json');
                config = typeof configData === 'string' ? JSON.parse(configData || '{}') : (configData || {});
            }
            const fallback = businessSetup || {};

            setBackOfficeUrl(config.backOfficeUrl || config.apiUrl || fallback.backOfficeUrl || fallback.apiUrl || '');
            setBackOfficeApiKey(config.backOfficeApiKey || config.apiKey || fallback.backOfficeApiKey || fallback.apiKey || '');
            setLocationId(config.locationId || fallback.locationId || '');
            setOutletId(config.outletId || fallback.outletId || '');
            setOutletName(config.outletName || fallback.outletName || '');
            setShowDevFooter(config.showDeveloperFooter !== undefined ? config.showDeveloperFooter : (fallback.showDeveloperFooter !== false));

            if (config.mpesaConfig || fallback.mpesaConfig) {
                setMpesaConfig((prev) => ({ ...prev, ...(config.mpesaConfig || fallback.mpesaConfig) }));
            }
        } catch (e) {
            console.error("Failed to load developer config", e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            if (window.electron && window.electron.readData) {
                const logData = await window.electron.readData('app-errors.log');
                setLogs(typeof logData === 'string' ? logData : JSON.stringify(logData || 'No logs recorded.'));
            } else {
                setLogs('Logs are only available in the Desktop App environment.');
            }
        } catch (e) {
            setLogs('Failed to read logs. ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleBusinessDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setBusinessData({ ...businessData, [e.target.name]: value });
    };

    const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'info' = 'danger') => {
        setConfirmDialogState({ isOpen: true, title, description, onConfirm, variant });
    };

    const handleArchive = async () => {
        try {
            await archiveTransactions(pruneDays);
            setSuccessMsg('Data archived successfully.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            setError('Failed to archive data.');
            setTimeout(() => setError(''), 3000);
        }
        setConfirmDialogState(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteRange = () => {
        if (!deleteDateRange.start || !deleteDateRange.end) {
            setError("Invalid date range.");
            setTimeout(() => setError(''), 3000);
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
            setError("No eligible receipts found. Note: Today's receipts cannot be deleted.");
            setTimeout(() => setError(''), 3000);
            return;
        }

        showConfirm(
            "Delete Receipts",
            `Found ${idsToDelete.length} receipts to delete. This is PERMANENT and cannot be undone. Proceed?`,
            () => {
                deleteTransactions(idsToDelete);
                setSuccessMsg(`${idsToDelete.length} receipts deleted.`);
                setTimeout(() => setSuccessMsg(''), 3000);
                setConfirmDialogState(prev => ({ ...prev, isOpen: false }));
            }
        );
    };

    const copyLogs = () => {
        navigator.clipboard.writeText(logs);
        setSuccessMsg('Logs copied to clipboard');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const downloadLogs = () => {
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiz-pos-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSaveSettings = async () => {
        const updatedSetup = {
            ...businessSetup,
            ...businessData,
            backOfficeUrl,
            backOfficeApiKey,
            locationId,
            outletId,
            outletName,
            apiUrl: backOfficeUrl,
            apiKey: backOfficeApiKey,
            showDeveloperFooter: showDevFooter,
            mpesaConfig,
            isSetup: true
        };
        // @ts-ignore
        saveBusinessSetup(updatedSetup);

        if (window.electron && window.electron.saveDeveloperConfig) {
            await window.electron.saveDeveloperConfig({
                backOfficeUrl,
                backOfficeApiKey,
                locationId,
                outletId,
                outletName,
                showDeveloperFooter: showDevFooter,
                mpesaConfig
            });
        }

        setSuccessMsg('Settings saved successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleScanDevices = async () => {
        setIsScanning(true);
        setDiscoveredDevices([]);
        
        try {
            // Probe local endpoint for active payment terminal
            const response = await fetch('http://localhost:8080/device/info', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.device) {
                    setDiscoveredDevices([{
                        name: data.device.deviceName || 'Unknown Terminal',
                        serial: data.device.serialNumber || 'N/A',
                        ip: data.device.ipAddress || '127.0.0.1',
                        status: data.device.status || 'READY',
                        provider: data.device.provider || 'N/A'
                    }]);
                } else {
                    setError('Received invalid response from terminal device');
                }
            } else {
                setError(`Terminal returned error: ${response.statusText}`);
            }
        } catch (error: any) {
            console.error('Scan error:', error);
            setError(`Failed to scan for PDQ devices: ${error.message || 'Connection refused. Ensure terminal is active on port 8080.'}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleBackup = async () => {
        if (!window.electron) {
            setError('Backup is only supported in Desktop mode');
            return;
        }
        setIsBackingUp(true);
        try {
            const result = await window.electron.backupData();
            if (result.success) {
                setSuccessMsg(`Backup saved to ${result.filePath}`);
            } else {
                if (result.error !== 'User cancelled backup') {
                    setError(result.error);
                }
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async () => {
        if (!window.electron) {
            setError('Restore is only supported in Desktop mode');
            return;
        }

        if (!window.confirm('WARNING: Restoring will overwrite all current local data. The app will restart after a successful restore. Are you sure you want to proceed?')) {
            return;
        }

        try {
            const result = await window.electron.restoreData();
            if (result.success) {
                setSuccessMsg('Restore successful. Restarting application...');
                localStorage.removeItem('pos-storage');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                if (result.error !== 'User cancelled restore') {
                    setError(result.error);
                }
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPin('');
        setActiveMenu('general');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans select-none">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-8 left-8 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20 z-50"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent" />
                </div>

                <div className="z-10 w-full max-w-5xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Left Side */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="relative">
                             <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-6 border border-white/20">
                                <Shield className="w-12 h-12 text-white" />
                             </div>
                             <div className="absolute -top-2 -right-2 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-cyan-300" />
                             </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                                DEVELOPER
                            </h1>
                            <p className="text-purple-200/70 text-lg font-medium tracking-wide">
                                Restricted System Access
                            </p>
                        </div>

                        <div className="flex gap-5 py-4">
                            {Array.from({length: Math.max(7, pin.length)}).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-5 h-5 rounded-full transition-all duration-300 border-2 ${
                                        pin.length > i
                                            ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                                            : "bg-transparent border-white/30"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Hidden input to allow keyboard typing */}
                        <input
                            ref={inputRef}
                            className="opacity-0 absolute -z-10"
                            onKeyDown={handleKeyDown}
                            autoFocus
                            autoComplete="off"
                        />

                        <button
                            onClick={() => handleLogin()}
                            disabled={pin.length < 4}
                            className="group relative px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-cyan-50 transition-all shadow-2xl active:scale-95 disabled:opacity-50 flex items-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            AUTHORIZE
                            <Lock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>

                        {authError && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 animate-bounce">
                                <AlertTriangle className="w-4 h-4" /> {authError}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Glass Keypad */}
                    <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700">
                        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl w-full max-w-[400px]">
                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => { handleKeyPress(num.toString()); inputRef.current?.focus(); }}
                                        className="aspect-square rounded-2xl text-3xl font-bold text-white bg-white/5 hover:bg-white/20 transition-all active:scale-90 border border-white/10 flex items-center justify-center"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={() => { handleKeyPress('clear'); inputRef.current?.focus(); }}
                                    className="aspect-square rounded-2xl flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-200 transition-all border border-red-500/30 active:scale-90"
                                >
                                    <X className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={() => { handleKeyPress('0'); inputRef.current?.focus(); }}
                                    className="aspect-square rounded-2xl text-3xl font-bold text-white bg-white/5 hover:bg-white/20 transition-all active:scale-90 border border-white/10 flex items-center justify-center"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => { handleKeyPress('delete'); inputRef.current?.focus(); }}
                                    className="aspect-square rounded-2xl flex items-center justify-center bg-slate-500/20 hover:bg-slate-500/40 text-white transition-all border border-white/10 active:scale-90"
                                >
                                    <Delete className="w-8 h-8" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Configuration...</div>;

    const renderMenuButton = (id: string, icon: React.ReactNode, label: string) => (
        <button
            onClick={() => setActiveMenu(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                activeMenu === id
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Sidebar Menu */}
            <div className="w-full md:w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 tracking-tight">DEV PORTAL</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">System Settings</p>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {renderMenuButton('general', <Settings className="w-5 h-5" />, 'General Config')}
                    {renderMenuButton('payments', <CreditCard className="w-5 h-5" />, 'Payment Gateways')}
                    {renderMenuButton('etims', <FileCheck className="w-5 h-5" />, 'KRA eTIMS')}
                    {renderMenuButton('security', <Shield className="w-5 h-5" />, 'Security & Session')}
                    {renderMenuButton('database', <Database className="w-5 h-5" />, 'Database & Sync')}
                    {renderMenuButton('messaging', <MessageSquare className="w-5 h-5" />, 'Messaging & API')}
                    {renderMenuButton('hardware', <Smartphone className="w-5 h-5" />, 'Hardware')}
                    {renderMenuButton('logs', <FileText className="w-5 h-5" />, 'System Logs')}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-medium transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Secure Logout
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Status Messages at Top */}
                    {successMsg && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                            <CheckCircle className="w-6 h-6 flex-shrink-0" />
                            <p className="font-medium">{successMsg}</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {/* Menu Content: General Config */}
                    {activeMenu === 'general' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            {/* Cloud Connection */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Cloud Sync API Connection</h2>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Back-Office API URL</label>
                                        <input
                                            type="text"
                                            value={backOfficeUrl}
                                            onChange={(e) => setBackOfficeUrl(e.target.value)}
                                            placeholder="https://your-server.com/api"
                                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">API Auth Key</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords['backOfficeApiKey'] ? 'text' : 'password'}
                                                value={backOfficeApiKey}
                                                onChange={(e) => setBackOfficeApiKey(e.target.value)}
                                                placeholder="Bearer token or API Key"
                                                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('backOfficeApiKey')}
                                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPasswords['backOfficeApiKey'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Location ID (Hub)</label>
                                            <input
                                                type="text"
                                                value={locationId}
                                                onChange={(e) => setLocationId(e.target.value)}
                                                placeholder="e.g. loc_123"
                                                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Outlet ID (Terminal)</label>
                                            <input
                                                type="text"
                                                value={outletId}
                                                onChange={(e) => setOutletId(e.target.value)}
                                                placeholder="e.g. out_456"
                                                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Outlet Name</label>
                                            <input
                                                type="text"
                                                value={outletName}
                                                onChange={(e) => setOutletName(e.target.value)}
                                                placeholder="e.g. Register 1"
                                                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Receipt Config */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <Printer className="w-5 h-5 text-teal-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Print Formatting</h2>
                                </div>
                                <div className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-800">Show Developer Footer</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Append "System Designed by Whizpoint Solutions" to thermal receipts.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={showDevFooter}
                                            onChange={(e) => setShowDevFooter(e.target.checked)}
                                        />
                                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: Payment Gateways */}
                    {activeMenu === 'payments' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Payment Gateways</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-8">
                                {/* M-Pesa */}
                                <div className="border rounded-xl overflow-hidden">
                                    <div className="bg-green-50 p-4 border-b flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1024px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" className="h-8" />
                                          <h3 className="font-bold text-green-800 text-lg">STK Push & C2B API</h3>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" className="sr-only peer" checked={mpesaConfig.enabled} onChange={(e) => setMpesaConfig({...mpesaConfig, enabled: e.target.checked})} />
                                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                      </label>
                                      </div>
                                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                                      <div>
                                          <label className="block text-sm font-medium">Environment</label>
                                          <select name="environment" value={mpesaConfig.environment} onChange={(e) => setMpesaConfig({...mpesaConfig, environment: e.target.value as any})} className="w-full p-3 border rounded-lg">
                                          <option value="Sandbox">Sandbox (Testing)</option>
                                          <option value="Production">Live (Production)</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Callback Domain</label>
                                          <input type="text" name="callbackUrl" value={mpesaConfig.callbackUrl || 'https://api.whizpoint.app'} onChange={(e) => setMpesaConfig({...mpesaConfig, callbackUrl: e.target.value})} className="w-full p-3 border rounded-lg" placeholder="https://..." />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Type</label>
                                          <select name="type" value={mpesaConfig.type} onChange={(e) => setMpesaConfig({...mpesaConfig, type: e.target.value as any})} className="w-full p-3 border rounded-lg">
                                          <option value="Till">Buy Goods (Till Number)</option>
                                          <option value="Paybill">Paybill</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Consumer Key</label>
                                          <input type="text" name="consumerKey" value={mpesaConfig.consumerKey} onChange={(e) => setMpesaConfig({...mpesaConfig, consumerKey: e.target.value})} className="w-full p-3 border rounded-lg" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Consumer Secret</label>
                                          <input type={showPasswords['mpesaConsumerSecret'] ? 'text' : 'password'} name="consumerSecret" value={mpesaConfig.consumerSecret} onChange={(e) => setMpesaConfig({...mpesaConfig, consumerSecret: e.target.value})} className="w-full p-3 border rounded-lg" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Passkey</label>
                                          <input type={showPasswords['mpesaPasskey'] ? 'text' : 'password'} name="passkey" value={mpesaConfig.passkey} onChange={(e) => setMpesaConfig({...mpesaConfig, passkey: e.target.value})} className="w-full p-3 border rounded-lg" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-purple-700">Business Shortcode (Store No. / Head Office)</label>
                                          <input type="text" name="shortcode" value={mpesaConfig.shortcode} onChange={(e) => setMpesaConfig({...mpesaConfig, shortcode: e.target.value})} className="w-full p-3 border rounded-lg border-purple-200 bg-purple-50" placeholder="e.g. 123456" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-blue-700">Till / Paybill Number (PartyB)</label>
                                          <input type="text" name="partyB" value={mpesaConfig.partyB} onChange={(e) => setMpesaConfig({...mpesaConfig, partyB: e.target.value})} className="w-full p-3 border rounded-lg border-blue-200 bg-blue-50" placeholder="e.g. 3098707" />
                                      </div>
                                      <div className="md:col-span-2 flex gap-4">
                                          <button type="button" onClick={() => togglePasswordVisibility('mpesaPasskey')} className="text-sm text-blue-600">Toggle Passkey Visibility</button>
                                          <button type="button" onClick={() => togglePasswordVisibility('mpesaConsumerSecret')} className="text-sm text-blue-600">Toggle Secret Visibility</button>
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Initiator Name (For Status APIs)</label>
                                          <input type="text" name="initiatorName" value={mpesaConfig.initiatorName || ''} onChange={(e) => setMpesaConfig({...mpesaConfig, initiatorName: e.target.value})} className="w-full p-3 border rounded-lg" placeholder="e.g. api_user_whiz" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Initiator Password</label>
                                          <input type={showPasswords['mpesaInitiatorPassword'] ? 'text' : 'password'} name="initiatorPassword" value={mpesaConfig.initiatorPassword || ''} onChange={(e) => setMpesaConfig({...mpesaConfig, initiatorPassword: e.target.value})} className="w-full p-3 border rounded-lg" placeholder="Enter password" />
                                          <button type="button" onClick={() => togglePasswordVisibility('mpesaInitiatorPassword')} className="text-xs text-blue-600 mt-1">Toggle Visibility</button>
                                      </div>
                                      <div className="md:col-span-2 mt-4 bg-green-50 p-4 rounded-xl border border-green-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                          <div>
                                              <h4 className="font-bold text-green-800">C2B Integration (Direct Till Payments)</h4>
                                              <p className="text-sm text-green-700">Register your endpoints to capture real customer names for payments sent directly to your Till.</p>
                                          </div>
                                          <button 
                                              type="button" 
                                              onClick={async () => {
                                                  try {
                                                      const res = await fetch(`${mpesaConfig.callbackUrl || 'https://api.whizpoint.app'}/api/mpesa/c2b/v1/registerurl`, {
                                                          method: 'POST',
                                                          headers: { 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({ businessId: businessData.businessId || businessData.id })
                                                      });
                                                      const data = await res.json();
                                                      toast.success('C2B Registration Response: ' + JSON.stringify(data));
                                                  } catch (err: any) {
                                                      toast.error('Error: ' + err.message);
                                                  }
                                              }}
                                              className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 whitespace-nowrap"
                                          >
                                              Register C2B URLs
                                          </button>
                                      </div>
                                      </div>
                                </div>

                                {/* Card Processing */}
                                <div className="border rounded-xl overflow-hidden">
                                    <div className="bg-blue-50 p-4 border-b">
                                    <h3 className="font-bold text-blue-800 text-lg">Card Processing</h3>
                                    </div>
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                                    <div>
                                        <label className="block text-sm font-medium">Integration Mode</label>
                                        <select name="cardMode" value={businessData.cardMode} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg">
                                        <option value="standalone">Standalone PDQ Entry</option>
                                        <option value="integrated">Integrated Smart Terminal API</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Gateway Provider</label>
                                        <select name="cardGateway" value={businessData.cardGateway} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg">
                                        <option value="paystack">Paystack</option>
                                        <option value="flutterwave">Flutterwave</option>
                                        <option value="bank_api">Direct Bank API</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 flex items-center p-4 bg-gray-50 rounded-lg border">
                                        <input type="checkbox" name="cardSimulator" checked={businessData.cardSimulator || false} onChange={handleBusinessDataChange} className="w-5 h-5 text-blue-600 rounded" />
                                        <label className="ml-3 font-medium text-gray-700">Enable Developer Card Simulator (Fakes successful payments for testing)</label>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: KRA eTIMS */}
                    {activeMenu === 'etims' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src="https://itax.kra.go.ke/KRA-Portal/assets/images/kra_logo.png" alt="KRA" className="h-8 mr-2" />
                                    <h2 className="text-lg font-bold text-gray-800">eTIMS Compliance</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium">Environment</label>
                                        <select name="etimsEnv" value={businessData.etimsEnv} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg">
                                            <option value="sandbox">Sandbox (Testing)</option>
                                            <option value="live">Live (Production)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">KRA PIN</label>
                                        <input type="text" name="etimsPin" value={businessData.etimsPin || ''} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg uppercase" placeholder="P000000000A" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Branch ID</label>
                                        <input type="text" name="etimsBranchId" value={businessData.etimsBranchId || ''} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg" placeholder="00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Device Serial Number</label>
                                        <input type="text" name="etimsDeviceSerial" value={businessData.etimsDeviceSerial || ''} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg" placeholder="WhizpointPOS-VSCU-001" />
                                    </div>
                                </div>
                                
                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-4">
                                    <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
                                    <p className="text-sm text-orange-800">Note: Ensure your VSCU Security Keys and Integration Tokens are securely stored in the `.env` file of the backend service. Do not expose them in the frontend UI.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: Security */}
                    {activeMenu === 'security' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-orange-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Security & Session Management</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
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
                                                        setBusinessData((prev: any) => ({ ...prev, autoLogoffEnabled: newVal }));
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
                                                            onClick={() => setBusinessData((prev: any) => ({ ...prev, autoLogoffMinutes: mins }))}
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
                                                            setBusinessData((prev: any) => ({ ...prev, autoLogoffMinutes: val }));
                                                        }}
                                                        className="ml-2 w-20 px-2 py-1 text-sm border rounded"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Keyboard className="w-5 h-5 text-gray-600" />
                                                <div>
                                                    <h3 className="font-medium text-gray-800">On-Screen Keyboard</h3>
                                                    <p className="text-xs text-gray-500">Enable virtual keyboard for touchscreens</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-600">{businessData.onScreenKeyboard ? 'Enabled' : 'Disabled'}</span>
                                                <button
                                                    onClick={() => {
                                                        const newVal = !businessData.onScreenKeyboard;
                                                        setBusinessData((prev: any) => ({ ...prev, onScreenKeyboard: newVal }));
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${businessData.onScreenKeyboard ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${businessData.onScreenKeyboard ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: Hardware */}
                    {activeMenu === 'hardware' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-gray-800" />
                                    <h2 className="text-lg font-bold text-gray-800">Hardware Integration</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="border rounded-xl overflow-hidden">
                                    <div className="bg-blue-50 p-4 border-b flex items-center justify-between">
                                        <h3 className="font-bold text-blue-800 text-lg">PDQ Physical Terminal</h3>
                                        <button 
                                            onClick={handleScanDevices}
                                            disabled={isScanning}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition"
                                        >
                                            {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {isScanning ? 'Scanning...' : 'Scan for PDQ Terminals'}
                                        </button>
                                    </div>
                                    <div className="p-5 bg-white space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-gray-800">Currently Paired IP</h4>
                                                <p className="text-sm text-gray-500">{businessData.hardware?.pdqTerminalIp || 'None'}</p>
                                            </div>
                                        </div>
                                        
                                        {discoveredDevices.length > 0 && (
                                            <div className="space-y-3 mt-4">
                                                <h4 className="font-semibold text-gray-700">Discovered Devices</h4>
                                                {discoveredDevices.map((device, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-white transition-colors">
                                                        <div>
                                                            <h5 className="font-bold text-gray-800">{device.name}</h5>
                                                            <p className="text-sm text-gray-600">SN: {device.serial} | IP: {device.ip}</p>
                                                            <p className="text-xs font-medium mt-1">
                                                                <span className={device.status === 'READY' || device.status === 'ONLINE' ? 'text-green-600' : 'text-blue-600'}>{device.status}</span>
                                                                {device.provider && device.provider !== 'N/A' && <span className="text-gray-500"> • {device.provider}</span>}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setBusinessData((prev: any) => ({
                                                                    ...prev,
                                                                    hardware: {
                                                                        ...prev.hardware,
                                                                        pdqTerminalIp: device.ip
                                                                    }
                                                                }));
                                                                setSuccessMsg(`Paired with ${device.name} at ${device.ip}`);
                                                                setTimeout(() => setSuccessMsg(''), 3000);
                                                            }}
                                                            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
                                                        >
                                                            Pair
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: Database & Sync */}
                    {activeMenu === 'database' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            {/* Backup & Restore */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <HardDrive className="w-5 h-5 text-orange-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Local Snapshot Backup</h2>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-500 mb-6">
                                        Create a zip archive of all current local POS data (`business-setup.json`, `products.json`, etc.) or restore from a previous archive.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={handleBackup}
                                            disabled={isBackingUp}
                                            className="px-6 py-3 bg-orange-100 text-orange-800 hover:bg-orange-200 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isBackingUp ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                            Create Backup
                                        </button>
                                        <button
                                            onClick={handleRestore}
                                            className="px-6 py-3 bg-gray-900 text-white hover:bg-black rounded-lg font-bold transition-colors flex items-center gap-2"
                                        >
                                            <HardDrive className="w-5 h-5" />
                                            Restore Archive
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Data Management (Prune/Archive) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <Database className="w-5 h-5 text-red-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Data Management</h2>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
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

                                    <div className="bg-red-100 border border-red-300 rounded-xl p-6">
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
                            </div>
                        </div>
                    )}

                    {/* Menu Content: Messaging */}
                    {activeMenu === 'messaging' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-5 h-5 text-green-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Digital Receipts & Messaging</h2>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="bg-green-50 p-4 border border-green-200 rounded-xl">
                                    <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2"><Smartphone className="w-5 h-5"/> WhatsApp Business API</h3>
                                    <p className="text-sm text-green-700 mb-4">Configure Meta WhatsApp API credentials to send digital PDF receipts directly to customers.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium">WhatsApp API Key / Token</label>
                                            <input type="password" name="whatsappApiKey" value={businessData.whatsappApiKey || ''} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Phone Number ID</label>
                                            <input type="text" name="whatsappPhoneId" value={businessData.whatsappPhoneId || ''} onChange={handleBusinessDataChange} className="w-full p-3 border rounded-lg bg-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: System Logs */}
                    {activeMenu === 'logs' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-gray-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Terminal Output (app-errors.log)</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={fetchLogs} className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" title="Refresh">
                                        <RefreshCw className={`w-5 h-5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button onClick={copyLogs} disabled={!logs} className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50" title="Copy">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                    <button onClick={downloadLogs} disabled={!logs} className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50" title="Download">
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-[#1e1e1e] flex-1 p-4 overflow-y-auto font-mono text-xs text-[#00ff00]">
                                {isLoadingLogs ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">Retrieving system buffer...</div>
                                ) : logs ? (
                                    <pre className="whitespace-pre-wrap">{typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2)}</pre>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">No buffer data available. Click refresh to poll.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Global Save Action */}
                    {(activeMenu === 'general' || activeMenu === 'payments' || activeMenu === 'etims' || activeMenu === 'security' || activeMenu === 'messaging') && (
                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <Save className="w-6 h-6" />
                                Save Current Configuration
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog 
                isOpen={confirmDialogState.isOpen}
                title={confirmDialogState.title}
                description={confirmDialogState.description}
                onConfirm={() => {
                    confirmDialogState.onConfirm();
                    setConfirmDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setConfirmDialogState(prev => ({ ...prev, isOpen: false }))}
                variant={confirmDialogState.variant}
            />
        </div>
    );
};

export default DeveloperPage;
