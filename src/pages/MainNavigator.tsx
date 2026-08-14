import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePosStore } from '../store/posStore';
import ProductGrid from '../components/ProductGrid';
import OrderArea from '../components/OrderArea';
import ReportsPage from '../components/ReportsPage';
import CreditCustomersPage from '../components/CreditCustomersPage';
import DailyClosingScreen from '../components/DailyClosingScreen';
import SettingsPage from '../components/SettingsPage';
import EnhancedExpenseTracker from '../components/EnhancedExpenseTracker';
import SyncEngine from '../components/SyncEngine';
import Dashboard from '../components/Dashboard';
import InventoryManagement from '../components/InventoryManagement';
import LoyaltyProgram from '../components/LoyaltyProgram';
import BarcodeScanner from '../components/BarcodeScanner';
import OfflineSyncStatus from '../components/OfflineSyncStatus';
import BusinessRegistrationPage from './BusinessRegistrationPage';

import LoginScreen from '../components/LoginScreen';
import AppLayout from '../components/AppLayout';
import PreviousReceiptsPage from '../components/PreviousReceiptsPage';
import MobileReceiptsPage from './MobileReceiptsPage';
import SalariesPage from './SalariesPage';
import DeveloperPage from './DeveloperPage';
import UsersPage from './UsersPage';

import ProcurementPage from '../components/ProcurementPage';
import FinancialLedgerPage from '../components/FinancialLedgerPage';
import ShiftAuditPage from '../components/ShiftAuditPage';
import ETIMSManagementPage from '../components/eTIMSManagementPage';

const MainNavigator = () => {
  const { businessSetup, users } = usePosStore();

  if (!businessSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading WHIZ POS...</p>
        </div>
      </div>
    );
  }

  if (!businessSetup.isSetup || (users.length === 0 && businessSetup.deviceRole !== 'TerminalMode')) {
    return (
      <Routes>
        <Route path="/setup" element={<BusinessRegistrationPage />} />
        <Route path="*" element={<Navigate to="/setup" />} />
      </Routes>
    );
  }

  if (businessSetup && !businessSetup.isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-theme(spacing.24))]">
            {/*
              Product Grid Container:
              - overflow-y-auto: Allows scrolling within this column ONLY.
              - h-full: Ensures it fills the calculated height.
            */}
            <div className="lg:col-span-2 h-full overflow-y-auto pr-2">
              <ProductGrid />
            </div>

            {/*
              Order Area Container:
              - h-full: Fills height.
              - overflow-hidden: Prevents outer scroll.
              - The OrderArea component itself handles internal scrolling for items.
            */}
            <div className="lg:col-span-1 h-full overflow-hidden">
              <OrderArea />
            </div>
          </div>
        } />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/customers" element={<CreditCustomersPage />} />
        <Route path="/expenses" element={<EnhancedExpenseTracker />} />
        <Route path="/salaries" element={<SalariesPage />} />
        <Route path="/closing" element={<DailyClosingScreen />} />
        <Route path="/sync" element={<OfflineSyncStatus />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/register" element={<BusinessRegistrationPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/procurement" element={<ProcurementPage />} />
        <Route path="/ledger" element={<FinancialLedgerPage />} />
        <Route path="/shift-audit" element={<ShiftAuditPage />} />
        <Route path="/etims" element={<ETIMSManagementPage />} />
        <Route path="/loyalty" element={<LoyaltyProgram />} />
        <Route path="/scanner" element={<BarcodeScanner />} />
        <Route path="/status" element={<OfflineSyncStatus />} />
        <Route path="/previous-receipts" element={<PreviousReceiptsPage />} />
        <Route path="/mobile-receipts" element={<MobileReceiptsPage />} />

        <Route path="/manage" element={<SettingsPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppLayout>
  );
};

export default MainNavigator;
