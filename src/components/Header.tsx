import React from 'react';
import { usePosStore } from '../store/posStore';
import { User, LogOut, Menu } from 'lucide-react';
import ConnectionHealthPill from './ConnectionHealthPill';

/**
 * Header component for the application.
 * Displays the current logged-in cashier, connection health pill, and a logout button.
 */
const Header = () => {
  const { currentCashier, logout, toggleSidebar } = usePosStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-xs p-3.5 flex justify-between items-center border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <ConnectionHealthPill />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-gray-800 font-semibold text-xs">{currentCashier?.name || 'Cashier'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
