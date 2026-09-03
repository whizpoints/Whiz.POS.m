import Swal from 'sweetalert2';
import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, HardDrive, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { soundManager } from '../lib/soundUtils';
import setupBg from '../assets/setup_install_bg.png';
import toast from 'react-hot-toast';

export default function BusinessRegistration() {
  const [step, setStep] = useState<'SELECT' | 'DISCOVERING' | 'SERVERS' | 'WAITING' | 'SUCCESS'>('SELECT');
  const [servers, setServers] = useState<{name: string, url: string}[]>([]);
  const [selectedServer, setSelectedServer] = useState<{name: string, url: string} | null>(null);
  const [terminalName, setTerminalName] = useState('Terminal 1');
  const [serverUrl, setServerUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { finishSetup, saveBusinessSetup, syncFromServer } = usePosStore();

  // Polling ref
  const pollInterval = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const handleRestore = async () => {
    soundManager.playClick();
    if (window.electron && window.electron.restoreData) {
      try {
        const res = await window.electron.restoreData();
        if (res && res.success) {
          Swal.fire({
            title: 'Success', 
            text: 'Data restored successfully. Application will reload.', 
            icon: 'success',
            background: '#1e293b',
            color: '#ffffff',
            confirmButtonColor: '#3b82f6'
          }).then(() => {
            window.location.reload();
          });
        }
      } catch (err: any) {
        toast.error(err.message || 'Restore failed');
      }
    } else {
      toast.error('Electron API not available');
    }
  };

  const handleDiscover = async () => {
    soundManager.playClick();
    setStep('DISCOVERING');
    setErrorMsg('');

    if (window.electron && window.electron.discoverLocalServer) {
      try {
        const discovered = await window.electron.discoverLocalServer();
        if (discovered && discovered.length > 0) {
          setServers(discovered);
          setStep('SERVERS');
        } else {
          setErrorMsg('Could not find a local server on the network. Make sure the Admin Server is running.');
          setStep('SELECT');
        }
      } catch (err: any) {
         setErrorMsg('Discovery error: ' + (err.message || 'Unknown'));
         setStep('SELECT');
      }
    } else {
      // Mock for web/dev mode
      setTimeout(() => {
        setServers([{ name: 'Dev Server', url: 'http://localhost:5050' }]);
        setStep('SERVERS');
      }, 2000);
    }
  };

  const handleSelectServer = (server: {name: string, url: string}) => {
    setSelectedServer(server);
    setServerUrl(server.url);
  };

  const startRegistration = async () => {
    if (!serverUrl || !terminalName) return;
    setStep('WAITING');
    
    try {
      const macAddress = 'MAC-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const res = await fetch(`${serverUrl}/api/terminals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ macAddress, name: terminalName })
      });
      
      if (!res.ok) throw new Error('Registration request failed');
      const data = await res.json();
      
      // Start polling for approval every 3 seconds
      pollInterval.current = setInterval(() => checkApproval(serverUrl, data.terminalId), 3000);
    } catch (err: any) {
      toast.error('Failed to contact server at ' + serverUrl);
      setStep('SELECT');
    }
  };

  const checkApproval = async (ip: string, terminalId: string) => {
    try {
      const res = await fetch(`${ip}/api/terminals/${terminalId}`);
      if (!res.ok) return;
      
      const terminal = await res.json();
      
      if (terminal.status === 'APPROVED' && terminal.apiKey) {
        if (pollInterval.current) clearInterval(pollInterval.current);
        
        setStep('SUCCESS');
        soundManager.playPop();
        
        const networkSetup = {
          businessName: terminalName || 'Network Terminal', // Will be overwritten by sync with real business name
          terminalName: terminalName || 'Network Terminal',
          apiKey: terminal.apiKey,
          outletId: terminal.outletId,
          deviceRole: 'TerminalMode',
          lanAdminIp: ip,
          apiUrl: ip,
          isLoggedIn: false,
          isSetup: true,
          printerType: 'thermal',
          createdAt: new Date().toISOString()
        };

        // Save network config to unblock the POS
        saveBusinessSetup(networkSetup as any);

        if (window.electron && window.electron.saveData) {
            await window.electron.saveData('business-setup.json', networkSetup);
        }

        // Trigger an immediate sync to get users before reload
        try {
           usePosStore.setState({ lastSyncTime: null });
           await syncFromServer();
        } catch (e) {
           console.error('Initial sync failed', e);
        }

        setTimeout(() => {
           window.location.reload();
        }, 2000);
      } else if (terminal.status === 'REJECTED') {
        if (pollInterval.current) clearInterval(pollInterval.current);
        toast.error('Terminal was rejected by the admin.');
        setStep('SELECT');
      }
    } catch (err) {
      // keep waiting
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
      style={{ backgroundImage: `url(${setupBg})` }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/80 border border-slate-700 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side Branding */}
        <div className="w-full md:w-1/3 bg-slate-800/80 p-8 flex flex-col justify-between border-r border-slate-700">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Whiz POS</h1>
            <p className="text-slate-400">Terminal Setup</p>
          </div>
          <div className="space-y-4">
             <div className={`flex items-center gap-3 ${step === 'SELECT' || step === 'DISCOVERING' ? 'text-blue-400' : 'text-slate-500'}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'SELECT' || step === 'DISCOVERING' ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                 1
               </div>
               <span className="text-sm">Network Discovery</span>
             </div>
             <div className={`flex items-center gap-3 ${step === 'WAITING' ? 'text-yellow-400' : 'text-slate-500'}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'WAITING' ? 'bg-yellow-500/20' : 'bg-slate-700'}`}>
                 2
               </div>
               <span className="text-sm">Admin Approval</span>
             </div>
             <div className={`flex items-center gap-3 ${step === 'SUCCESS' ? 'text-green-400' : 'text-slate-500'}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'SUCCESS' ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                 3
               </div>
               <span className="text-sm">Ready</span>
             </div>
          </div>
        </div>

        {/* Right Side Content */}
        <div className="w-full md:w-2/3 p-8 flex flex-col justify-center items-center relative">
          
          <AnimatePresence mode="wait">
            {step === 'SELECT' && (
              <motion.div 
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-md space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-2">Choose Setup Method</h2>
                  <p className="text-slate-400 text-sm">How would you like to configure this terminal?</p>
                </div>
                
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm mb-4">
                    {errorMsg}
                  </div>
                )}

                <button 
                  onClick={handleDiscover}
                  className="w-full flex items-center p-6 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-750 hover:border-blue-500/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Server className="text-blue-400" size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">Discover Server</h3>
                    <p className="text-sm text-slate-400">Automatically scan the network for a Local Admin Server</p>
                  </div>
                  <ArrowRight className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </button>

                <button 
                  onClick={handleRestore}
                  className="w-full flex items-center p-6 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-750 hover:border-purple-500/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <HardDrive className="text-purple-400" size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">Restore Backup</h3>
                    <p className="text-sm text-slate-400">Load a previous database backup (.wpos file)</p>
                  </div>
                  <ArrowRight className="text-slate-500 group-hover:text-purple-400 transition-colors" />
                </button>
              </motion.div>
            )}

            {step === 'DISCOVERING' && (
              <motion.div 
                key="discovering"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 animate-ping absolute inset-0" />
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                    <Server className="text-blue-400 animate-pulse" size={40} />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-white mb-2">Scanning Network...</h3>
                  <p className="text-slate-400 text-sm">Looking for the Whiz POS Admin Server</p>
                </div>
              </motion.div>
            )}

            {step === 'SERVERS' && (
              <motion.div 
                key="servers"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md space-y-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-medium text-white mb-2">Discovered Servers</h3>
                  <p className="text-slate-400 text-sm">Select a server to connect to</p>
                </div>
                
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {servers.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectServer(s)}
                      className={`w-full flex items-center p-4 rounded-xl border transition-all text-left ${selectedServer?.url === s.url ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-blue-500/50'}`}
                    >
                      <Server className={`w-8 h-8 mr-4 ${selectedServer?.url === s.url ? 'text-blue-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-white font-medium">{s.name}</div>
                        <div className="text-sm text-slate-400">{s.url}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedServer && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 pt-4 border-t border-slate-700 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Terminal Name</label>
                      <input 
                        type="text" 
                        value={terminalName}
                        onChange={(e) => setTerminalName(e.target.value)}
                        placeholder="e.g. Counter 1"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button 
                      onClick={() => startRegistration()}
                      disabled={!terminalName}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Connect & Request Approval
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => setStep('SELECT')}
                  className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
              </motion.div>
            )}

            {step === 'WAITING' && (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-6 text-center"
              >
                <Loader2 className="w-16 h-16 text-yellow-500 animate-spin" />
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">Waiting for Approval</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    Terminal has successfully reached the server at <span className="text-white font-mono">{serverUrl}</span>.<br/><br/>
                    Please ask the administrator to approve this device from the Back Office.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'SUCCESS' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-medium text-white mb-2">Terminal Approved!</h3>
                  <p className="text-slate-400">Configuration received. Starting POS...</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
