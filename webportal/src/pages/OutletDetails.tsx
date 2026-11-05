import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Server, Users, Package, ArrowLeft, Plus, Minus, Trash2, X, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBranchContext } from '../context/BranchContext';
import BatchAssignModal from '../components/Outlets/BatchAssignModal';
import { useConfirm } from '../context/ConfirmContext';
import { getApiBaseUrl } from '../lib/utils';
import { getCachedData, setCachedData } from '../lib/cache';

export default function OutletDetails() {
  const { confirm } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'inventory' | 'staff' | 'overview'>('inventory');
  const [outlet, setOutlet] = useState<any>(() => getCachedData('outlet_detail_' + (id || ''), null));
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [adjustStockModal, setAdjustStockModal] = useState<{ isOpen: boolean; inventoryId: string; productName: string; type: 'ADD' | 'DEDUCT'; amount: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Staff Tab
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Inventory Tab
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [inventorySearch, setInventorySearch] = useState('');

  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    fetchOutletDetails();
    fetchOrganizationData();
  }, [id]);

  const fetchOutletDetails = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/detail/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const outletData = await res.json();
        setOutlet(outletData);
        setCachedData('outlet_detail_' + (id || ''), outletData);
      } else {
        toast.error('Failed to load outlet details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error loading outlet');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizationData = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();

      // Fetch users
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => null);

      if (usersRes && usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
      }
      
      // Fetch all global products
      const productsRes = await fetch(`${API_BASE_URL}/api/inventory`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (productsRes.ok) {
        setAllProducts(await productsRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  // User Actions
  const assignUser = async () => {
    if (!selectedUserId) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUserId })
      });
      if (res.ok) {
        toast.success('Staff assigned to outlet');
        setSelectedUserId('');
        fetchOutletDetails();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to assign staff');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const removeUser = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Confirm Action',
      message: 'Remove this staff member from the outlet?'
    });
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Staff removed from outlet');
        fetchOutletDetails();
      } else {
        toast.error('Failed to remove staff');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  // Inventory Actions
  const assignProduct = async () => {
    if (!selectedProductId) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          productId: selectedProductId,
          locationId: outlet?.locationId || (activeLocationId === 'ALL' ? undefined : activeLocationId),
          stock: Number(initialStock) || 0
        })
      });
      if (res.ok) {
        toast.success('Product assigned to outlet successfully!');
        setSelectedProductId('');
        setInitialStock('0');
        fetchOutletDetails();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to assign product');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const adjustStock = (inventoryId: string, productName: string, type: 'ADD' | 'DEDUCT') => {
    setAdjustStockModal({ isOpen: true, inventoryId, productName, type, amount: '' });
  };

  const handleAdjustStockSubmit = async () => {
    if (!adjustStockModal) return;
    const { inventoryId, type, amount: amountStr } = adjustStockModal;
    
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ inventoryId, amount, type })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Stock ${type === 'ADD' ? 'added' : 'deducted'} successfully! New stock: ${data.stock}`);
        setAdjustStockModal(null);
        fetchOutletDetails();
      } else {
        toast.error(data.error || 'Failed to adjust stock');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/force-sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Outlet data marked for immediate sync to Edge POS!');
      } else {
        toast.error('Failed to trigger force sync');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading && !outlet) {
    return (
      <div className="p-8 text-center text-[color:var(--text-muted)] animate-in fade-in">
        <Server className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <h3 className="text-base font-semibold text-[color:var(--text-primary)]">Loading Outlet...</h3>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Outlet Not Found</h2>
        <Link to="/dashboard/outlets" className="btn btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Outlets
        </Link>
      </div>
    );
  }

  const assignedProductIds = (outlet.inventory || []).map((i: any) => i.productId);
  const unassignedProducts = allProducts.filter(p => !assignedProductIds.includes(p.id));

  const filteredInventory = (outlet.inventory || []).filter((item: any) => {
    const prodName = item.product?.name || '';
    const prodSku = item.product?.sku || '';
    const q = inventorySearch.toLowerCase();
    return prodName.toLowerCase().includes(q) || prodSku.toLowerCase().includes(q);
  });

  const totalStockUnits = (outlet.inventory || []).reduce((acc: number, curr: any) => acc + (curr.stock || 0), 0);
  const lowStockCount = (outlet.inventory || []).filter((i: any) => (i.stock || 0) <= (i.reorderLevel || 5)).length;

  return (
    <div className="space-y-6 p-4 md:p-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 rounded-2xl p-6 border border-gray-100 dark:border-white/10 dark:border-white/10 shadow-sm text-gray-900 dark:text-white dark:text-white">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/outlets" className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Outlet Register
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-400 font-mono">ID: {outlet.id}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
              <Server className="w-6 h-6 text-blue-600" />
              {outlet.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="btn btn-secondary inline-flex items-center gap-2 text-sm shadow-sm"
            title="Pushes latest catalog and inventory down to this outlet's local server and POS"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync to POS'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-gray-100 dark:border-white/10 dark:border-white/10 shadow-sm flex items-center justify-between text-gray-900 dark:text-white dark:text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Assigned Products</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{outlet.inventory?.length || 0}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-gray-100 dark:border-white/10 dark:border-white/10 shadow-sm flex items-center justify-between text-gray-900 dark:text-white dark:text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Total Stock On Hand</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalStockUnits.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-gray-100 dark:border-white/10 dark:border-white/10 shadow-sm flex items-center justify-between text-gray-900 dark:text-white dark:text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Low Stock SKUs</p>
            <p className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
              {lowStockCount}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-400'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-gray-100 dark:border-white/10 dark:border-white/10 shadow-sm flex items-center justify-between text-gray-900 dark:text-white dark:text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Assigned Cashiers</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{outlet.users?.length || 0}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inventory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> Outlet Inventory ({outlet.inventory?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Assigned Staff ({outlet.users?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-100'
          }`}
        >
          <Server className="w-4 h-4" /> Overview & Diagnostics
        </button>
      </div>

      {/* TAB: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Quick Assign Toolbar */}
          {(() => {
            const selectedProductObj = allProducts.find(p => p.id === selectedProductId);
            const availableInCentralStore = selectedProductObj ? Number(selectedProductObj.inStoreStock ?? selectedProductObj.stock ?? 0) : 0;
            const isOverStock = Boolean(selectedProductId) && Number(initialStock) > availableInCentralStore;

            return (
              <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-gray-200 dark:border-white/10 dark:border-white/10 shadow-sm space-y-4 text-gray-900 dark:text-white dark:text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Product from Central Store</h3>
                  {selectedProductId && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Central Store Available: {availableInCentralStore} units
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="input flex-1 bg-white dark:bg-slate-950/80 border dark:border-white/15 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Select a product from Central Store...</option>
                    {unassignedProducts.map(p => {
                      const avail = Number(p.inStoreStock ?? p.stock ?? 0);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Central Store: {avail} units
                        </option>
                      );
                    })}
                  </select>

                  <div className="w-36">
                    <input
                      type="number"
                      min="0"
                      max={availableInCentralStore}
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      placeholder="Initial stock"
                      className={`input w-full text-sm ${isOverStock ? 'border-rose-500 focus:ring-rose-500 bg-rose-50' : ''}`}
                      title="Initial quantity for this outlet"
                    />
                  </div>

                  <button
                    onClick={assignProduct}
                    disabled={!selectedProductId || isOverStock}
                    className="btn btn-primary text-sm inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Assign Product
                  </button>

                  <button
                    onClick={() => setIsBatchAssignModalOpen(true)}
                    className="btn btn-secondary text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    Batch Assign...
                  </button>
                </div>

                {isOverStock && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Cannot assign {initialStock} units: Central Store only has {availableInCentralStore} units available.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Inventory Table */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-gray-200 dark:border-white/10 dark:border-white/10 shadow-sm overflow-hidden text-gray-900 dark:text-white dark:text-white">
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <input
                  type="text"
                  placeholder="Filter outlet stock..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="input !pl-9 text-sm w-full"
                />
                <Package className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
              </div>

              <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Showing {filteredInventory.length} of {outlet.inventory?.length || 0} products
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-800/50/80 text-gray-600 dark:text-slate-300 uppercase text-xs border-b border-gray-100 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5 text-right">Selling Price</th>
                    <th className="px-6 py-3.5 text-center">Current Stock</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Stock Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-slate-400">
                        {inventorySearch ? 'No products matching search in this outlet' : 'No products assigned to this outlet yet. Use the bar above to assign inventory.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item: any) => {
                      const isLowStock = (item.stock || 0) <= (item.reorderLevel || 5);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:bg-slate-800/50/60 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-slate-400">{item.product?.sku || 'N/A'}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{item.product?.name || 'Unnamed Product'}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-right">
                            KES {Number(item.product?.price || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-base font-black ${isLowStock ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
                              {item.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isLowStock ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => adjustStock(item.id, item.product?.name, 'ADD')}
                                className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Add Stock (+)"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => adjustStock(item.id, item.product?.name, 'DEDUCT')}
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Deduct Stock (-)"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: STAFF */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-gray-200 dark:border-white/10 dark:border-white/10 shadow-sm space-y-4 text-gray-900 dark:text-white dark:text-white">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Staff Member to this Outlet</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input flex-1 bg-white dark:bg-slate-950/80 border dark:border-white/15 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select staff member...</option>
                {allUsers
                  .filter(u => !(outlet.users || []).some((ou: any) => ou.id === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role || 'CASHIER'}) - {u.email}
                    </option>
                  ))}
              </select>
              <button
                onClick={assignUser}
                disabled={!selectedUserId}
                className="btn btn-primary text-sm inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Assign to Outlet
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-gray-200 dark:border-white/10 dark:border-white/10 shadow-sm overflow-hidden text-gray-900 dark:text-white dark:text-white">
            <div className="p-4 border-b border-gray-100 dark:border-white/10 font-bold text-sm text-gray-900 dark:text-white">
              Assigned Staff Members ({outlet.users?.length || 0})
            </div>
            <div className="divide-y divide-gray-100">
              {(outlet.users || []).length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-slate-400 text-sm">
                  No staff members currently assigned to this outlet.
                </div>
              ) : (
                (outlet.users || []).map((user: any) => (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{user.email || 'No email registered'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 dark:text-slate-200">
                        {user.role || 'CASHIER'}
                      </span>
                      <button
                        onClick={() => removeUser(user.id)}
                        className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove staff from outlet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-gray-200 dark:border-white/10 dark:border-white/10 shadow-sm space-y-4 text-gray-900 dark:text-white dark:text-white">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Outlet Details & Cloud Sync Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/10">
              <span className="text-xs text-gray-400 dark:text-slate-400 uppercase font-bold">Outlet Name</span>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-1">{outlet.name}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/10">
              <span className="text-xs text-gray-400 dark:text-slate-400 uppercase font-bold">Outlet ID</span>
              <p className="font-mono text-gray-900 dark:text-white mt-1">{outlet.id}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/10">
              <span className="text-xs text-gray-400 dark:text-slate-400 uppercase font-bold">Created At</span>
              <p className="text-gray-900 dark:text-white mt-1">{new Date(outlet.createdAt).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/10">
              <span className="text-xs text-gray-400 dark:text-slate-400 uppercase font-bold">Last Synchronized</span>
              <p className="text-gray-900 dark:text-white mt-1">{new Date(outlet.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 dark:border-white/10 w-full max-w-md p-6 space-y-4 text-gray-900 dark:text-white dark:text-white">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {adjustStockModal.type === 'ADD' ? 'Add Stock to Outlet' : 'Deduct Stock from Outlet'}
              </h3>
              <button onClick={() => setAdjustStockModal(null)} className="p-1 rounded-full text-gray-400 dark:text-slate-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const adjustProductObj = allProducts.find(p => p.name === adjustStockModal.productName);
              const adjustCentralStock = adjustProductObj ? Number(adjustProductObj.inStoreStock ?? adjustProductObj.stock ?? 0) : 0;
              const isAdjustOver = adjustStockModal.type === 'ADD' && Number(adjustStockModal.amount) > adjustCentralStock;

              return (
                <>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-300">
                    <p>Product: <span className="font-bold text-gray-900 dark:text-white">{adjustStockModal.productName}</span></p>
                    {adjustStockModal.type === 'ADD' && (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        In Central Store: {adjustCentralStock}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mb-1">
                      Quantity to {adjustStockModal.type === 'ADD' ? 'Add (+)' : 'Deduct (-)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      autoFocus
                      value={adjustStockModal.amount}
                      onChange={(e) => setAdjustStockModal({ ...adjustStockModal, amount: e.target.value })}
                      className={`input w-full text-base font-bold ${isAdjustOver ? 'border-rose-500 bg-rose-50' : ''}`}
                      placeholder="e.g. 5"
                    />
                    {isAdjustOver ? (
                      <p className="text-xs font-bold text-rose-600 mt-1">
                        Cannot add {adjustStockModal.amount} units: Central Store only has {adjustCentralStock} units available.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
                        {adjustStockModal.type === 'ADD'
                          ? 'Deducts stock from Central Store and transfers it to this outlet.'
                          : 'Deducts stock from this outlet and returns it to Central Store.'}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setAdjustStockModal(null)}
                      className="btn btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isAdjustOver || !adjustStockModal.amount || Number(adjustStockModal.amount) <= 0}
                      onClick={handleAdjustStockSubmit}
                      className={`btn text-sm text-white disabled:opacity-50 ${adjustStockModal.type === 'ADD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                    >
                      Confirm {adjustStockModal.type === 'ADD' ? 'Addition' : 'Deduction'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Batch Assign Modal */}
      <BatchAssignModal
        isOpen={isBatchAssignModalOpen}
        onClose={() => setIsBatchAssignModalOpen(false)}
        outletId={id!}
        allProducts={allProducts}
        assignedProductIds={assignedProductIds}
        locationId={outlet.locationId}
        onComplete={fetchOutletDetails}
      />
    </div>
  );
}
