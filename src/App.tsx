import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { usePosStore } from './store/posStore';
import { CheckoutModal } from './components/Checkout';
import MainNavigator from './pages/MainNavigator';
import BusinessRegistrationPage from './pages/BusinessRegistrationPage';
import LoginScreen from './components/LoginScreen';
import DeveloperPage from './pages/DeveloperPage';
import OnScreenKeyboard from './components/OnScreenKeyboard';
import ErrorBoundary from './components/ErrorBoundary';
import AutoLogoutModal from './components/AutoLogoutModal';
import { useEffect, useRef, useState } from 'react';
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
  const isAutoLogoffEnabled = businessSetup?.isLoggedIn && (businessSetup?.autoLogoffEnabled === true);
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

  // Periodic Sync (Every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const state = usePosStore.getState();
      const rawUrl = state.businessSetup?.backOfficeUrl || state.businessSetup?.apiUrl;
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
