import React from 'react';
import { usePosStore } from '../store/posStore';
import { User, LogOut, Menu } from 'lucide-react';

/**
 * Header component for the application.
 * Displays the current logged-in cashier and a logout button.
 */
const Header = () => {
  const { currentCashier, logout, toggleSidebar } = usePosStore();

  /**
   * Handles the logout action by clearing the current user from the store.
   */
  const handleLogout = () => {
    logout();
  };

  const { businessSetup } = usePosStore();

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <button
        onClick={toggleSidebar}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Toggle Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <User className="w-6 h-6 text-gray-600" />
          <span className="text-gray-800 font-medium">{currentCashier?.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
