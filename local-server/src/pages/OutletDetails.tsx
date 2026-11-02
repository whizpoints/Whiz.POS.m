import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Server, Users, Package, ArrowLeft, Plus, Minus, Trash2, X, RefreshCw, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBranchContext } from '../context/BranchContext';
import BatchAssignModal from '../components/Outlets/BatchAssignModal';
import { useConfirm } from '../context/ConfirmContext';
import { getApiBaseUrl } from '../lib/utils';

export default function OutletDetails() {
  const { confirm } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'inventory'>('inventory');
  const [outlet, setOutlet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [adjustStockModal, setAdjustStockModal] = useState<{ isOpen: boolean; inventoryId: string; type: 'ADD' | 'DEDUCT'; amount: string } | null>(null);
  const [setStockModal, setSetStockModal] = useState<{ isOpen: boolean; inventoryId: string; productName: string; currentStock: number; stock: string } | null>(null);
  const [isPushingData, setIsPushingData] = useState(false);

  // Users Tab
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Inventory Tab
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [initialStock, setInitialStock] = useState('0');

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
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setOutlet(await res.json());
      } else {
        toast.error('Failed to load outlet details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load outlet details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizationData = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      
      // Fetch all users
      const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(Array.isArray(usersData) ? usersData.filter((u: any) => u.role === 'CASHIER' || u.role === 'MANAGER' || u.role === 'ADMIN') : []);
      }
      
      // Fetch all global products
      const productsRes = await fetch(`${API_BASE_URL}/api/inventory?locationId=${activeLocationId === 'ALL' ? '' : activeLocationId}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (productsRes.ok) {
        const prods = await productsRes.json();
        setAllProducts(Array.isArray(prods) ? prods : []);
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
        toast.success('User assigned to outlet');
        setSelectedUserId('');
        fetchOutletDetails();
      } else {
        toast.error((await res.json()).error || 'Failed to assign user');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const removeUser = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Confirm Action',
      message: 'Remove this user from the outlet?'
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
        toast.success('User removed from outlet');
        fetchOutletDetails();
      } else {
        toast.error((await res.json()).error || 'Failed to remove user');
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
          locationId: activeLocationId === 'ALL' ? undefined : activeLocationId,
          stock: Number(initialStock) || 0
        })
      });
      if (res.ok) {
        toast.success('Product assigned to outlet');
        setSelectedProductId('');
        setInitialStock('0');
        fetchOutletDetails();
      } else {
        toast.error((await res.json()).error || 'Failed to assign product');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const unassignProduct = async (inventoryId: string, productName?: string) => {
    const confirmed = await confirm({
      title: 'Unassign Product',
      message: `Are you sure you want to remove "${productName || 'this product'}" from this outlet? It will no longer appear on this outlet's POS terminal.`
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/inventory/${inventoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Product removed from outlet');
        fetchOutletDetails();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to unassign product');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const adjustStock = (inventoryId: string, type: 'ADD' | 'DEDUCT') => {
    setAdjustStockModal({ isOpen: true, inventoryId, type, amount: '' });
  };

  const handleAdjustStockSubmit = async () => {
    if (!adjustStockModal) return;
    const { inventoryId, type, amount: amountStr } = adjustStockModal;
    
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid quantity');
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
      if (res.ok) {
        toast.success(`Stock ${type === 'ADD' ? 'added' : 'deducted'} successfully`);
        setAdjustStockModal(null);
        fetchOutletDetails();
      } else {
        toast.error((await res.json()).error || 'Failed to adjust stock');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleSetStockSubmit = async () => {
    if (!setStockModal) return;
    const { inventoryId, stock: stockStr } = setStockModal;
    const stock = parseInt(stockStr);
    if (isNaN(stock) || stock < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/inventory/${inventoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ stock })
      });
      if (res.ok) {
        toast.success('Stock level updated successfully');
        setSetStockModal(null);
        fetchOutletDetails();
      } else {
        toast.error((await res.json()).error || 'Failed to update stock');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const pushCurrentData = async () => {
    setIsPushingData(true);
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}/force-sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Outlet data staged for synchronization to POS!');
      } else {
        toast.error((await res.json()).error || 'Failed to stage data for sync.');
      }
    } catch (e) {
      toast.error('Network error during sync.');
    } finally {
      setIsPushingData(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading outlet...</div>;
  if (!outlet) return <div className="p-8 text-center text-red-500">Outlet not found</div>;

  const assignedProductIds = (outlet.inventory || []).map((i: any) => i.productId);
  const unassignedProducts = allProducts.filter(p => !assignedProductIds.includes(p.id));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link to="/dashboard/outlets" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} /> Back to Outlets
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Server size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{outlet.name}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Created {new Date(outlet.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <button 
          onClick={pushCurrentData}
          disabled={isPushingData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} className={isPushingData ? 'animate-spin' : ''} />
          {isPushingData ? 'Syncing...' : 'Sync to POS'}
        </button>
      </div>

      <div className="flex gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Package size={16} /> Inventory <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{outlet.inventory?.length || 0}</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> Users <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{outlet.users?.length || 0}</span>
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Overview
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden p-6" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
        
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border flex items-center gap-4" style={{ borderColor: 'var(--border)' }}>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Assigned Staff</p>
                <p className="text-2xl font-bold">{outlet.users?.length || 0}</p>
              </div>
            </div>
            <div className="p-6 rounded-xl border flex items-center gap-4" style={{ borderColor: 'var(--border)' }}>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Package size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Assigned Products</p>
                <p className="text-2xl font-bold">{outlet.inventory?.length || 0}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex gap-2 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <select 
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select staff member to assign to this outlet...</option>
                {allUsers.filter(u => !outlet.users?.some((ou: any) => ou.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role || 'CASHIER'})</option>
                ))}
              </select>
              <button 
                onClick={assignUser}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={18} /> Assign Staff
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 border-b">Name</th>
                    <th className="px-6 py-4 border-b">Role</th>
                    <th className="px-6 py-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outlet.users?.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No users assigned to this outlet. Use the selector above to assign cashiers.</td></tr>
                  ) : (
                    outlet.users?.map((u: any) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-medium">{u.name}</td>
                        <td className="px-6 py-4 text-gray-500">
                          <span className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-bold uppercase">{u.role}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => removeUser(u.id)} 
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                            title="Remove staff from outlet"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Quick Assign Bar */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Assign Products to Outlet</h3>
                <button 
                  onClick={() => setIsBatchAssignModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} /> Batch Assign Products
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select 
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-sm"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Select product from global catalog...</option>
                  {unassignedProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku || 'No SKU'}) - KES {Number(p.price || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="w-32">
                  <input 
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    title="Initial stock quantity"
                  />
                </div>
                <button 
                  onClick={assignProduct}
                  disabled={!selectedProductId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap text-sm"
                >
                  <Plus size={16} /> Assign
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 border-b">Product</th>
                    <th className="px-6 py-4 border-b">Category</th>
                    <th className="px-6 py-4 border-b text-right">Price</th>
                    <th className="px-6 py-4 border-b text-center">Outlet Stock</th>
                    <th className="px-6 py-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outlet.inventory?.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No products assigned to this outlet yet. Use the bar above to assign inventory.</td></tr>
                  ) : (
                    outlet.inventory?.map((inv: any) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-medium">
                          {inv.product?.name || 'Unknown Item'} <span className="text-xs text-gray-400 block">{inv.product?.sku}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{inv.product?.category || 'General'}</td>
                        <td className="px-6 py-4 text-right">KES {Number(inv.product?.price || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSetStockModal({
                              isOpen: true,
                              inventoryId: inv.id,
                              productName: inv.product?.name || 'Product',
                              currentStock: inv.stock,
                              stock: String(inv.stock)
                            })}
                            className="font-bold text-gray-800 hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                            title="Click to edit stock directly"
                          >
                            {inv.stock}
                            <Edit3 size={12} className="text-gray-400" />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5 items-center">
                            <button 
                              onClick={() => adjustStock(inv.id, 'ADD')} 
                              className="w-7 h-7 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                              title="Add Stock (+)"
                            >
                              <Plus size={14} />
                            </button>
                            <button 
                              onClick={() => adjustStock(inv.id, 'DEDUCT')} 
                              className="w-7 h-7 flex items-center justify-center bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                              title="Deduct Stock (-)"
                            >
                              <Minus size={14} />
                            </button>
                            <button 
                              onClick={() => unassignProduct(inv.id, inv.product?.name)}
                              className="w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
                              title="Unassign / Remove from this outlet"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {outlet && (
        <BatchAssignModal 
          isOpen={isBatchAssignModalOpen}
          onClose={() => setIsBatchAssignModalOpen(false)}
          outletId={outlet.id}
          allProducts={allProducts}
          assignedProductIds={outlet.inventory?.map((oi: any) => oi.productId) || []}
          locationId={activeLocationId === 'ALL' ? '' : activeLocationId}
          onComplete={fetchOutletDetails}
        />
      )}

      {/* Adjust Stock (+/-) Modal */}
      {adjustStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {adjustStockModal.type === 'ADD' ? 'Add Stock' : 'Deduct Stock'}
              </h3>
              <button onClick={() => setAdjustStockModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Quantity</label>
              <input 
                type="number" 
                min="1"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={adjustStockModal.amount}
                onChange={(e) => setAdjustStockModal({ ...adjustStockModal, amount: e.target.value })}
                placeholder="e.g. 10"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setAdjustStockModal(null)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdjustStockSubmit}
                disabled={!adjustStockModal.amount || parseInt(adjustStockModal.amount) <= 0}
                className={`px-4 py-2 rounded-lg text-white font-medium text-sm ${adjustStockModal.type === 'ADD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50`}
              >
                Confirm {adjustStockModal.type === 'ADD' ? 'Addition' : 'Deduction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Set Stock Level Modal */}
      {setStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Set Exact Stock</h3>
                <p className="text-xs text-gray-500">{setStockModal.productName}</p>
              </div>
              <button onClick={() => setSetStockModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock: {setStockModal.currentStock}</label>
              <input 
                type="number" 
                min="0"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={setStockModal.stock}
                onChange={(e) => setSetStockModal({ ...setStockModal, stock: e.target.value })}
                placeholder="Enter new stock level"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setSetStockModal(null)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSetStockSubmit}
                disabled={setStockModal.stock === '' || parseInt(setStockModal.stock) < 0}
                className="px-4 py-2 rounded-lg text-white font-medium text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
