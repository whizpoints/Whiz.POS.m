import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePosStore } from '../store/posStore';
import { Store, Coffee, BarChart3, Users, Calendar, Settings, DollarSign, Database, Package, Gift, Camera, Activity, Building2, UserCheck, Printer, Smartphone, Maximize, Wrench, FileText, BookOpen, ShieldAlert, FileCheck2, History, RefreshCw } from 'lucide-react';

/**
 * Helper component to group navigation links with a title.
 *
 * @param {object} props
 * @param {string} props.title - The title of the navigation group.
 * @param {React.ReactNode} props.children - The navigation links to display within the group.
 */
const NavGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div>
    <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

/**
 * Main Navigation Sidebar component.
 * Displays navigation links based on the user's role (admin/manager vs cashier).
 * Uses `NavLink` for client-side routing with active state styling.
 */
const Navigation = () => {
  const businessSetup = usePosStore(state => state.businessSetup);
  const currentCashier = usePosStore(state => state.currentCashier);

  // Do not render navigation if business is not set up
  if (!businessSetup?.isSetup) {
    return null;
  }

  const userRole = currentCashier?.role;
  const isAdminOrManager = userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'manager';

  /**
   * Computes class names for navigation links.
   * Applies active styling if the link matches the current route.
   *
   * @param {object} props - Render props from NavLink.
   * @param {boolean} props.isActive - Whether the link is currently active.
   * @returns {string} The constructed class string.
   */
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-500 text-white'
        : 'text-gray-600 hover:bg-sky-100 hover:text-sky-600'
    }`;

  const toggleFullscreen = () => {
    if (window.electron && window.electron.toggleFullscreen) {
      window.electron.toggleFullscreen();
    }
  };

  return (
    <div className="w-64 bg-white shadow-md flex flex-col h-full">
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <Store className="w-8 h-8 text-sky-500" />
          <span className="font-bold text-xl text-gray-800 truncate" title={businessSetup?.businessName}>
            {businessSetup?.businessName}
          </span>
        </div>
      </div>
      <nav className="p-4 space-y-4 flex-1 overflow-y-auto">
        <NavGroup title="Point of Sale">
          <NavLink to="/" className={navLinkClasses}>
            <Coffee className="w-5 h-5" />
            <span>POS</span>
          </NavLink>
          <NavLink to="/mobile-receipts" className={navLinkClasses}>
            <Smartphone className="w-5 h-5" />
            <span>Mobile Receipts</span>
          </NavLink>
          <NavLink to="/customers" className={navLinkClasses}>
            <Users className="w-5 h-5" />
            <span>Credits</span>
          </NavLink>
          <NavLink to="/previous-receipts" className={navLinkClasses}>
            <Printer className="w-5 h-5" />
            <span>Old Receipts</span>
          </NavLink>

        </NavGroup>

        {isAdminOrManager && (
          <NavGroup title="Analytics">
            <NavLink to="/dashboard" className={navLinkClasses}>
              <Activity className="w-5 h-5" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/reports" className={navLinkClasses}>
              <BarChart3 className="w-5 h-5" />
              <span>Reports</span>
            </NavLink>
            <NavLink to="/ledger" className={navLinkClasses}>
              <BookOpen className="w-5 h-5" />
              <span>Financial Ledger</span>
            </NavLink>
            <NavLink to="/closing" className={navLinkClasses}>
              <Calendar className="w-5 h-5" />
              <span>Closing</span>
            </NavLink>
          </NavGroup>
        )}

        <NavGroup title="Management">
          <NavLink to="/expenses" className={navLinkClasses}>
            <DollarSign className="w-5 h-5" />
            <span>Expenses</span>
          </NavLink>
          {isAdminOrManager && (
            <NavLink to="/salaries" className={navLinkClasses}>
              <DollarSign className="w-5 h-5" />
              <span>Salaries</span>
            </NavLink>
          )}
          <NavLink to="/loyalty" className={navLinkClasses}>
            <Gift className="w-5 h-5" />
            <span>Loyalty</span>
          </NavLink>
        </NavGroup>

        {isAdminOrManager && (
          <NavGroup title="Inventory">
            <NavLink to="/inventory" className={navLinkClasses}>
              <Package className="w-5 h-5" />
              <span>Inventory Management</span>
            </NavLink>
            <NavLink to="/procurement" className={navLinkClasses}>
              <Store className="w-5 h-5" />
              <span>Procurement & GRN</span>
            </NavLink>
          </NavGroup>
        )}

        {isAdminOrManager && (
          <NavGroup title="Administration">
            <NavLink to="/shift-audit" className={navLinkClasses}>
              <ShieldAlert className="w-5 h-5" />
              <span>Shift Audit</span>
            </NavLink>
            <NavLink to="/etims" className={navLinkClasses}>
              <FileCheck2 className="w-5 h-5" />
              <span>eTIMS Monitor</span>
            </NavLink>
            <NavLink to="/sync" className={navLinkClasses}>
              <RefreshCw className="w-5 h-5" />
              <span>Synchronization</span>
            </NavLink>
            <NavLink to="/sync-history" className={navLinkClasses}>
              <History className="w-5 h-5" />
              <span>Sync History</span>
            </NavLink>
            <NavLink to="/manage" className={navLinkClasses}>
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
            <NavLink to="/users" className={navLinkClasses}>
              <UserCheck className="w-5 h-5" />
              <span>Users</span>
            </NavLink>
          </NavGroup>
        )}

        <NavGroup title="Tools">
            <NavLink to="/scanner" className={navLinkClasses}>
                <Camera className="w-5 h-5" />
                <span>Scanner</span>
            </NavLink>
        </NavGroup>
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={toggleFullscreen}
          className="flex items-center space-x-3 px-4 py-2 w-full text-left text-gray-600 hover:bg-sky-100 hover:text-sky-600 rounded-lg transition-colors"
        >
          <Maximize className="w-5 h-5" />
          <span className="font-medium text-sm">Full Screen</span>
        </button>

      </div>
    </div>
  );
};

export default Navigation;
