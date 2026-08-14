
import React, { useState } from 'react';
import InventoryManagement from './InventoryManagement';
import SettingsPage from './SettingsPage';
import ReportsPage from './ReportsPage';
import { usePosStore } from '../store/posStore';
import { Navigate } from 'react-router-dom';

const BackOfficeDashboard = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const { currentCashier } = usePosStore();

  if (currentCashier?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return <InventoryManagement />;
      case 'users':
        return <SettingsPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'inventory' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'users' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'reports' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>
      <div className="mt-4">{renderContent()}</div>
    </div>
  );
};

export default BackOfficeDashboard;
