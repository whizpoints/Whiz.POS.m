import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { usePosStore } from './store/posStore';
import { CheckoutModal } from './components/Checkout';
import OpenBillsModal from './components/Hospitality/OpenBillsModal';
import MainNavigator from './pages/MainNavigator';
import BusinessRegistrationPage from './pages/BusinessRegistrationPage';
import LoginScreen from './components/LoginScreen';
import DeveloperPage from './pages/DeveloperPage';
import OnScreenKeyboard from './components/OnScreenKeyboard';
import ErrorBoundary from './components/ErrorBoundary';
import AutoLogoutModal from './components/AutoLogoutModal';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAutoLogout } from './hooks/useAutoLogout';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from './components/ui/modal';
import { Button } from './components/ui/button';
import { Toaster } from 'react-hot-toast';

function App() {
  const { businessSetup, loadInitialData, isDataLoaded, logout, currentCashier, 
    isTransactionSuccessPopupOpen, lastCompletedTransaction, closeTransactionSuccessPopup 
  } = usePosStore(state => ({
    businessSetup: state.businessSetup,
    loadInitialData: state.loadInitialData,
    isDataLoaded: state.isDataLoaded,
    logout: state.logout,
    currentCashier: state.currentCashier,
    isTransactionSuccessPopupOpen: state.isTransactionSuccessPopupOpen,
    lastCompletedTransaction: state.lastCompletedTransaction,
    closeTransactionSuccessPopup: state.closeTransactionSuccessPopup
  }));

  // Auto-logoff Logic
  // Default to 5 minutes if not set or 0. Ensure at least 1 minute to prevent immediate loops if config is bad.
  const idleMinutes = Math.max(1, Number(businessSetup?.autoLogoffMinutes) || 5);
  const idleMs = idleMinutes * 60 * 1000;

  // Use custom hook to track idle state.
  // Only enable tracking if explicitly enabled in settings AND logged in.
  const isAutoLogoffEnabled = Boolean(businessSetup?.isLoggedIn && (businessSetup?.autoLogoffEnabled === true));
  const isIdle = useAutoLogout(idleMs, isAutoLogoffEnabled);

  // Debug log for auto-logoff
  useEffect(() => {
    if (isAutoLogoffEnabled) {
      console.log(`Auto-logoff configured: ${idleMinutes} minutes (${idleMs}ms)`);
    }
  }, [isAutoLogoffEnabled, idleMinutes, idleMs]);

  useEffect(() => {
    const init = async () => {
      await loadInitialData();
    };
    init();
  }, [loadInitialData]);

  // Setup Electron IPC Listeners
  useEffect(() => {
    if (window.electron) {
        window.electron.onMobileDataSync((event, payload) => {
            console.log('Received mobile data sync:', payload);
            usePosStore.getState().handleMobileDataSync(payload);
        });
        window.electron.onNewMobileReceipt((event, receipt) => {
            console.log('Received new mobile receipt:', receipt);
            usePosStore.getState().addMobileReceipt(receipt);
        });
    }
  }, []);

  // Listen for discovered servers from Electron background discovery
  useEffect(() => {
    if (window.electron && typeof (window.electron as any).onServerDiscovered === 'function') {
      const unsubscribe = (window.electron as any).onServerDiscovered((_event: any, server: any) => {
        if (server && server.url) {
          usePosStore.getState().updateServerUrl(server.url);
        }
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, []);

  // Initial check: if current apiUrl is unreachable, perform proactive discovery
  useEffect(() => {
    const checkServerConnectivity = async () => {
      const state = usePosStore.getState();
      const currentUrl = state.businessSetup?.apiUrl || state.businessSetup?.backOfficeUrl;
      let reachable = false;
      if (currentUrl) {
        try {
          const res = await fetch(`${currentUrl.replace(/\/$/, '')}/api/health`, {
            signal: AbortSignal.timeout(1500)
          });
          if (res.ok) reachable = true;
        } catch (e) {
          reachable = false;
        }
      }
      if (!reachable && window.electron && typeof window.electron.discoverLocalServer === 'function') {
        console.log('[App] Current server URL unreachable. Running proactive auto-discovery...');
        try {
          const discovered = await window.electron.discoverLocalServer();
          const foundUrl = Array.isArray(discovered) ? discovered[0]?.url : ((discovered as any)?.url || (typeof discovered === 'string' ? discovered : null));
          if (foundUrl) {
            console.log('[App] Auto-discovered active server:', foundUrl);
            await usePosStore.getState().updateServerUrl(foundUrl);
          }
        } catch (err) {
          console.warn('[App] Proactive discovery failed:', err);
        }
      }
    };
    checkServerConnectivity();
  }, []);

  // Setup Socket.io Real-Time Sync with dynamic reconnect on IP change
  const currentApiUrl = usePosStore(state => state.businessSetup?.apiUrl || state.businessSetup?.backOfficeUrl);
  const activeBusinessId = usePosStore(state => state.businessSetup?.businessId || (state.businessSetup as any)?.cloudBusinessId);

  useEffect(() => {
    let apiUrl = currentApiUrl?.replace(/\/$/, '')?.replace(/\/api$/, '') || '';
    
    if (apiUrl) {
      console.log('[Socket] Connecting socket to:', apiUrl);
      const socket = io(apiUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected to POS Server for real-time sync at', apiUrl);
        const bId = usePosStore.getState().businessSetup?.businessId || (usePosStore.getState().businessSetup as any)?.cloudBusinessId;
        if (bId) {
          socket.emit('join_business', bId);
        }
      });

      socket.on('connect_error', (err) => {
        console.warn(`[Socket] Connection error to ${apiUrl}:`, err.message);
        // If connection fails, trigger background server discovery
        if (window.electron && typeof window.electron.discoverLocalServer === 'function') {
          window.electron.discoverLocalServer().then((discovered: any) => {
            const foundUrl = Array.isArray(discovered) ? discovered[0]?.url : (discovered?.url || (typeof discovered === 'string' ? discovered : null));
            if (foundUrl && foundUrl !== apiUrl) {
              usePosStore.getState().updateServerUrl(foundUrl);
            }
          }).catch(() => {});
        }
      });

      // Receive downward sync from Cloud or other POS terminals
      socket.on('cloud_sync_received', (data) => {
        console.log('[Socket] Received real-time sync data:', data);
        if (typeof usePosStore.getState().syncFromServer === 'function') usePosStore.getState().syncFromServer(); // Trigger a pull to fetch new data
      });

      socket.on('stock_updated', (data) => {
        console.log('[Socket] Stock updated remotely:', data);
        if (typeof usePosStore.getState().syncFromServer === 'function') usePosStore.getState().syncFromServer();
      });

      socket.on('mpesa_payment_received', (data) => {
        console.log('[Socket] Real-time M-Pesa payment received:', data);
        window.dispatchEvent(new CustomEvent('mpesa_payment_received', { detail: data }));
      });

      return () => {
        try {
          if (socket.connected) {
            socket.disconnect();
          } else {
            socket.once('connect', () => socket.disconnect());
            socket.close();
          }
        } catch (e) {}
      };
    }
  }, [currentApiUrl, activeBusinessId]);

  // Periodic Sync (Every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const state = usePosStore.getState();
      const rawUrl = state.businessSetup?.apiUrl || state.businessSetup?.backOfficeUrl;
      let apiUrl = rawUrl?.replace(/\/$/, '')?.replace(/\/api$/, '') || '';
      const apiKey = state.businessSetup?.backOfficeApiKey || state.businessSetup?.apiKey;
      
      if (state.isOnline && apiUrl && apiKey) {
        // 1. Push data to server
        // We use pushDataToServer() because it handles Direct DB Push (Full State Sync) if configured,
        // which is more robust than just processing the queue, ensuring mobile data is always propagated.
        state.pushDataToServer();

        // 2. Pull updates from server
        state.syncFromServer();
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const { businessSetup, openKeyboard } = usePosStore.getState();
      if (businessSetup?.onScreenKeyboard && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        if ((event.target as HTMLInputElement).type === 'file') {
          return;
        }
        openKeyboard(event.target as HTMLInputElement | HTMLTextAreaElement);
      }
    };

    window.addEventListener('focusin', handleFocus);

    return () => {
      window.removeEventListener('focusin', handleFocus);
    };
  }, []);

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading WHIZ POS...</p>
        </div>
      </div>
    );
  }

  if (!businessSetup || !businessSetup.isSetup) {
    return <BusinessRegistrationPage />;
  }

  // Double Check: Even if isLoggedIn is true, if we don't have a currentCashier, we should show Login.
  // This handles the "Ghost" session where sessionToken exists but cashier object is null/lost.
  const showLogin = !businessSetup.isLoggedIn || !currentCashier;

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route path="/developer" element={<DeveloperPage />} />
            <Route path="*" element={showLogin ? <LoginScreen /> : <MainNavigator />} />
          </Routes>

          {/* Global Modals */}
          <CheckoutModal />
          <OpenBillsModal />
          <OnScreenKeyboard />


          {/* Auto Logoff Warning Modal */}
          {/* Only show if logged in, feature enabled, and idle. */}
          {isAutoLogoffEnabled && isIdle && (
            <AutoLogoutModal onLogout={logout} userName={currentCashier?.name} />
          )}

          
          {/* Transaction Success Popup */}
          <Modal
            isOpen={isTransactionSuccessPopupOpen}
            onClose={closeTransactionSuccessPopup}
            title="Transaction Successful!"
            description="Your order has been completed successfully."
          >
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              {lastCompletedTransaction && (
                <div className="space-y-3 mb-8">
                  <p className="text-sm text-slate-500">Transaction ID</p>
                  <p className="text-xl font-bold text-slate-900 font-mono">{lastCompletedTransaction.id}</p>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Total Amount</span>
                      <span className="font-bold text-slate-900">KES {lastCompletedTransaction.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Payment Method</span>
                      <span className="font-semibold text-slate-700 capitalize">{lastCompletedTransaction.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              )}
              <Button 
                onClick={closeTransactionSuccessPopup}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
              >
                Done
              </Button>
            </div>
          </Modal>

          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#1f2937',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
