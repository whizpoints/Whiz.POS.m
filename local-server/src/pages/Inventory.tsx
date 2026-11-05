import { useState, useEffect, useRef } from 'react';
import { Search, Package, Plus, Edit2, Trash2, ArrowRightLeft, FileUp, Download, Warehouse, PackageCheck, AlertCircle, Barcode, Check, X, RotateCcw, Boxes, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBranchContext } from '../context/BranchContext';
import { getApiBaseUrl } from '../lib/utils';
import StockTransferModal from '../components/Inventory/StockTransferModal';
import ProductModal from '../components/Inventory/ProductModal';
import { Modal } from '../components/ui/modal';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

export default function Inventory() {
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutletScope, setSelectedOutletScope] = useState<string>('CENTRAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Quick Add (Receive) Modal
  const [quickAddProduct, setQuickAddProduct] = useState<string | null>(null);
  const [quickAddQty, setQuickAddQty] = useState('');

  // Formal GRN Receive Modal
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    productId: '',
    quantity: '',
    costPrice: '',
    referenceNote: ''
  });
  const [isReceiving, setIsReceiving] = useState(false);
  const [bizSettings, setBizSettings] = useState<{ inventoryMode: string; hasCentralStore: boolean }>({
    inventoryMode: 'SEPARATE',
    hasCentralStore: true
  });
  const [receiveDestination, setReceiveDestination] = useState<'STORE' | 'SHARED' | 'OUTLET'>('STORE');
  const [receiveSearch, setReceiveSearch] = useState('');
  const [selectedReceiveProduct, setSelectedReceiveProduct] = useState<any | null>(null);
  const receiveSearchInputRef = useRef<HTMLInputElement>(null);
  const receiveQtyInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    fetchBizSettings();
    fetchOutlets();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [activeLocationId, selectedOutletScope]);

  const fetchBizSettings = async () => {
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/business/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const s = typeof data.settings === 'string' ? JSON.parse(data.settings) : (data.settings || {});
        const isShared = s.inventoryMode === 'SHARED' || s.sharedInventory === true;
        const hasStore = s.hasCentralStore !== false;
        setBizSettings({
          inventoryMode: isShared ? 'SHARED' : 'SEPARATE',
          hasCentralStore: hasStore
        });
        setReceiveDestination(hasStore && !isShared ? 'STORE' : 'SHARED');
      }
    } catch (e) {}
  };

  const fetchOutlets = async () => {
    const token = localStorage.getItem('whiz-token');
    try {
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOutlets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Failed to fetch outlets:', e);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem('whiz-token');
    try {
      setLoading(true);
      const API_BASE_URL = getApiBaseUrl();
      const params = new URLSearchParams();
      if (activeLocationId !== 'ALL') params.append('locationId', activeLocationId);
      if (selectedOutletScope && selectedOutletScope !== 'ALL') params.append('outletId', selectedOutletScope);

      const res = await fetch(`${API_BASE_URL}/api/inventory?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Confirm Action',
      message: 'Are you sure you want to delete this product?'
    });
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Product deleted successfully');
        fetchProducts();
      } else {
        toast.error('Failed to delete product');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleNew = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleQuickAdd = (productId: string) => {
    setQuickAddProduct(productId);
    setQuickAddQty('');
  };

  const submitQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddProduct || !quickAddQty || isNaN(Number(quickAddQty))) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/inventory/quick-add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: quickAddProduct,
          quantity: Number(quickAddQty),
          locationId: activeLocationId === 'ALL' ? null : activeLocationId
        })
      });

      if (res.ok) {
        toast.success(`Received ${quickAddQty} units into Central Store!`);
        fetchProducts();
        setQuickAddProduct(null);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to add stock');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const openReceiveModal = () => {
    setReceiveSearch('');
    setSelectedReceiveProduct(null);
    setReceiveForm({ productId: '', quantity: '', costPrice: '', referenceNote: '' });
    setIsReceiveModalOpen(true);
    setTimeout(() => receiveSearchInputRef.current?.focus(), 150);
  };

  const handleSelectReceiveProduct = (prod: any) => {
    setSelectedReceiveProduct(prod);
    setReceiveForm(prev => ({
      ...prev,
      productId: prod.id,
      costPrice: prod.costPrice ? String(prod.costPrice) : prev.costPrice
    }));
    setTimeout(() => receiveQtyInputRef.current?.focus(), 150);
  };

  const handleReceiveSearchChange = (val: string) => {
    setReceiveSearch(val);
    const trimmed = val.trim();
    if (!trimmed) return;
    // Check for exact barcode or exact SKU match (typical of barcode scanners)
    const exactMatch = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase())
    );
    if (exactMatch) {
      handleSelectReceiveProduct(exactMatch);
      setReceiveSearch('');
    }
  };

  const handleReceiveSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (receiveMatchingProducts.length > 0) {
        handleSelectReceiveProduct(receiveMatchingProducts[0]);
        setReceiveSearch('');
      }
    }
  };

  const handleReceiveStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(receiveForm.quantity, 10);
    if (!receiveForm.productId || isNaN(qty) || qty <= 0) {
      toast.error('Please select a product and enter a positive quantity');
      return;
    }

    try {
      setIsReceiving(true);
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/inventory/receive-stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: receiveForm.productId,
          quantity: qty,
          costPrice: receiveForm.costPrice ? parseFloat(receiveForm.costPrice) : undefined,
          referenceNote: receiveForm.referenceNote || undefined,
          locationId: activeLocationId === 'ALL' ? null : activeLocationId,
          destinationType: receiveDestination
        })
      });

      if (res.ok) {
        const destLabel = receiveDestination === 'STORE' ? 'Central Store' : 'Active Inventory';
        toast.success(`Received ${qty} units directly into ${destLabel}!`);
        setIsReceiveModalOpen(false);
        setReceiveForm({ productId: '', quantity: '', costPrice: '', referenceNote: '' });
        setSelectedReceiveProduct(null);
        setReceiveSearch('');
        fetchProducts();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to receive stock');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsReceiving(false);
    }
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (activeLocationId !== 'ALL') {
      formData.append('locationId', activeLocationId);
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/inventory/import/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const d = await res.json();
        toast.success(d.message);
        fetchProducts();
      } else {
        toast.error('Import failed');
      }
    } catch (err) {
      toast.error('Network error during import');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExport = () => {
    const token = localStorage.getItem('whiz-token');
    const API_BASE_URL = getApiBaseUrl();
    const query = activeLocationId === 'ALL' ? '' : `&locationId=${activeLocationId}`;
    triggerDownload(`${API_BASE_URL}/api/inventory/template/products?token=${token}${query}`, 'Products_Template.xlsx');
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized')))];
  
  const receiveMatchingProducts = products.filter(p => {
    if (!receiveSearch.trim()) return true;
    const q = receiveSearch.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || (p.category || 'Uncategorized') === selectedCategory;
    const matchesQuery = !searchQuery || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-in p-6">
      {/* Central Store Context Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-blue-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-blue-950 flex items-center gap-2">
              Central Store & Warehouse Receiving
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Offline-First Primary Pool
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-0.5">
              Goods received from suppliers arrive directly into the Central Store. To assign stock to local POS registers, transfer via{' '}
              <Link to="/dashboard/outlets" className="underline font-semibold hover:text-blue-950">
                Outlets & Terminals
              </Link>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={openReceiveModal}
            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 shadow-sm"
          >
            <PackageCheck className="w-4 h-4" /> Receive Delivery (GRN)
          </button>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Inventory & Products</h2>
            <p className="section-desc">Manage your product catalog, receive warehouse stock, and oversee store distribution.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button 
              onClick={handleExport}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 text-green-600" /> Export Excel
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <FileUp className="w-4 h-4 text-blue-600" /> Import Excel
            </button>
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ArrowRightLeft className="w-4 h-4" /> Transfer Stock
            </button>
            <button onClick={handleNew} className="btn btn-primary btn-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Product
            </button>
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border-b border-[color:var(--border-glass)]">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="search-box flex-1" style={{ minWidth: 0 }}>
                <Search />
                <input 
                  placeholder="Search SKU, barcode or name..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={selectedOutletScope}
                  onChange={(e) => setSelectedOutletScope(e.target.value)}
                  className="input py-1.5 px-3 text-xs font-semibold rounded-xl bg-white border border-gray-300 shadow-sm"
                  title="Filter inventory view"
                >
                  <option value="CENTRAL">Central Store (Warehouse Supply)</option>
                  <option value="ALL">All Stock (Consolidated)</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>Outlet: {o.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {categories.map((c) => (
                <button 
                  key={c} 
                  onClick={() => setSelectedCategory(c)}
                  className={`chip ${selectedCategory === c ? 'active bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th className="font-tabular text-right">Price (KES)</th>
                  <th className="font-tabular text-right">In-Store Stock</th>
                  <th className="font-tabular text-right">Outlet Stock</th>
                  <th className="font-tabular text-right">Total System Stock</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-6 text-gray-500">Loading inventory catalog...</td></tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map(p => {
                    const inStore = p.inStoreStock ?? p.stock ?? 0;
                    const total = p.totalStock ?? p.stock ?? 0;
                    const outletAllocated = p.outletStock ?? Math.max(0, total - inStore);

                    return (
                      <tr key={p.id}>
                        <td className="font-mono text-xs text-[color:var(--text-muted)]">{p.sku}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color:var(--accent-primary-soft)] text-[color:var(--accent-primary)]">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{p.name}</div>
                              {p.barcode && <div className="text-[10px] text-gray-400 font-mono">Barcode: {p.barcode}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="text-[color:var(--text-secondary)]">{p.category || 'Uncategorized'}</td>
                        <td className="font-tabular font-semibold text-right">{Number(p.price || 0).toLocaleString()}</td>
                        
                        {/* Central Store Stock */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-semibold px-2 py-0.5 rounded ${inStore <= (p.reorderLevel || 5) ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                              {inStore}
                            </span>
                            <button 
                              onClick={() => handleQuickAdd(p.id)}
                              className="p-1 rounded-md hover:bg-blue-100 text-blue-600 transition-colors"
                              title="Quick Receive into Store (+)"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                        {/* Outlet Stock */}
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium px-2 py-0.5 rounded text-xs ${outletAllocated > 0 ? 'bg-purple-50 text-purple-700' : 'text-gray-400'}`}>
                            {outletAllocated}
                          </span>
                        </td>

                        {/* Total Consolidated Stock */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-gray-900">
                            {total}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleEdit(p)} 
                              className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-blue-600"
                              title="Edit product and in-store stock"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id)} 
                              className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-[color:var(--text-muted)]">
                      No products found. Use <strong>New Product</strong> or <strong>Receive Delivery (GRN)</strong> to add inventory!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Stock Transfer Modal */}
      <StockTransferModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        products={products}
        onTransferComplete={fetchProducts}
      />
      
      {/* Product Edit / Create Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
        onComplete={fetchProducts}
      />
      
      {/* Quick Add Stock Modal */}
      <Modal isOpen={!!quickAddProduct} onClose={() => setQuickAddProduct(null)} title="Quick Receive into Store">
        <form onSubmit={submitQuickAdd} className="space-y-4 mt-2">
          <p className="text-xs text-gray-500">
            Stock added here goes directly into the <strong>Central Store</strong> warehouse.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Received</label>
            <input 
              type="number" 
              required
              min="1"
              className="w-full p-2 border rounded-lg" 
              value={quickAddQty} 
              onChange={e => setQuickAddQty(e.target.value)} 
              placeholder="e.g. 50"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setQuickAddProduct(null)} className="btn btn-ghost">Cancel</button>
            <button type="submit" className="btn btn-primary">Receive into Store</button>
          </div>
        </form>
      </Modal>

      {/* Formal Goods Received Note (GRN) Modal */}
      <Modal 
        isOpen={isReceiveModalOpen} 
        onClose={() => setIsReceiveModalOpen(false)} 
        title={bizSettings.hasCentralStore && receiveDestination === 'STORE' ? "Receive Delivery into Central Store (GRN)" : "Receive Delivery (Direct to Inventory)"}
        className="max-w-2xl sm:max-w-3xl"
      >
        <form onSubmit={handleReceiveStockSubmit} className="space-y-4 mt-2">
          {/* Destination Selector */}
          {bizSettings.hasCentralStore ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Goods Receiving Destination
              </label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setReceiveDestination('STORE')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    receiveDestination === 'STORE' ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Store className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Central Store / Warehouse</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiveDestination('SHARED')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    receiveDestination === 'SHARED' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct to Active Inventory</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
              <Boxes className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>
                <strong>Direct-to-Inventory Mode:</strong> Goods received will immediately be credited into active selling stock across all registers without requiring a store holding stage.
              </span>
            </div>
          )}

          {/* Product Selection Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Select Product to Receive *
            </label>

            {selectedReceiveProduct ? (
              /* Selected Product Card */
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-base truncate">
                      {selectedReceiveProduct.name}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 mt-0.5">
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        SKU: {selectedReceiveProduct.sku}
                      </span>
                      {selectedReceiveProduct.barcode && (
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-gray-500" />
                          {selectedReceiveProduct.barcode}
                        </span>
                      )}
                      <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        Current In-Store: {selectedReceiveProduct.inStoreStock ?? selectedReceiveProduct.stock ?? 0} units
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReceiveProduct(null);
                    setReceiveForm(prev => ({ ...prev, productId: '' }));
                    setTimeout(() => receiveSearchInputRef.current?.focus(), 100);
                  }}
                  className="btn btn-sm btn-secondary bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shrink-0 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Change
                </button>
              </div>
            ) : (
              /* Product Search Combobox */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  <input
                    ref={receiveSearchInputRef}
                    type="text"
                    value={receiveSearch}
                    onChange={e => handleReceiveSearchChange(e.target.value)}
                    onKeyDown={handleReceiveSearchKeyDown}
                    placeholder="Search by product name, SKU, or scan barcode with scanner..."
                    className="w-full pl-9 pr-8 py-2.5 border-2 border-blue-300 rounded-xl bg-white text-sm focus:outline-none focus:border-blue-600 transition-colors shadow-sm"
                  />
                  {receiveSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiveSearch('');
                        receiveSearchInputRef.current?.focus();
                      }}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filtered Search Results Dropdown List */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {receiveMatchingProducts.length > 0 ? (
                    receiveMatchingProducts.slice(0, 50).map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectReceiveProduct(p)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 truncate">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                            <span>SKU: {p.sku}</span>
                            {p.barcode && <span>• Barcode: {p.barcode}</span>}
                            {p.category && <span className="text-gray-400">({p.category})</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">In-Store</div>
                            <div className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {p.inStoreStock ?? p.stock ?? 0} units
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1 rounded-lg"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No products found matching "{receiveSearch}". Try another name or SKU.
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Tip: Barcode scanners will auto-select the product when scanned. Press Enter to select the top match.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Quantity Received (Units) *
              </label>
              <input
                ref={receiveQtyInputRef}
                type="number"
                required
                min="1"
                placeholder="e.g. 100"
                value={receiveForm.quantity}
                onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                className="w-full p-2.5 border rounded-lg text-base font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                New Cost Price (Optional, KES)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 450.00"
                value={receiveForm.costPrice}
                onChange={e => setReceiveForm({ ...receiveForm, costPrice: e.target.value })}
                className="w-full p-2.5 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Supplier Delivery Note / Invoice Ref
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice #9823 / Brookside Dairy"
              value={receiveForm.referenceNote}
              onChange={e => setReceiveForm({ ...receiveForm, referenceNote: e.target.value })}
              className="w-full p-2.5 border rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button 
              type="button" 
              onClick={() => setIsReceiveModalOpen(false)} 
              className="btn btn-ghost"
              disabled={isReceiving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary inline-flex items-center gap-1.5"
              disabled={isReceiving || !receiveForm.productId || !receiveForm.quantity}
            >
              <PackageCheck className="w-4 h-4" />
              {isReceiving ? 'Processing...' : 'Confirm Goods Received'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
