import { useState, useRef, useEffect } from 'react';



import { Search, Package, Plus, Edit2, Trash2, ArrowRightLeft, FileUp, Download, Warehouse, PackageCheck, Barcode, Check, X, RotateCcw, Boxes, Store } from 'lucide-react';

import { Link } from 'react-router-dom';

import { useBranchContext } from '../context/BranchContext';

import { getApiBaseUrl } from '../lib/utils';

import StockTransferModal from '../components/Inventory/StockTransferModal';

import ProductModal from '../components/Inventory/ProductModal';

import { Modal } from '../components/ui/modal';

import toast from 'react-hot-toast';

import { useConfirm } from '../context/ConfirmContext';

import { getCachedData, setCachedData } from '../lib/cache';



export default function Inventory() {

  const { confirm } = useConfirm();

  const { activeLocationId } = useBranchContext();

  const [selectedOutletId, setSelectedOutletId] = useState<string>('ALL');

  const cacheKey = `inventory_${activeLocationId || 'ALL'}_${selectedOutletId}`;

  const [products, setProducts] = useState<any[]>(() => getCachedData(cacheKey, []));

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [quickAddProduct, setQuickAddProduct] = useState<string | null>(null);

  const [quickAddQty, setQuickAddQty] = useState('');

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

  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  const [searchQuery, setSearchQuery] = useState('');

  const [outlets, setOutlets] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);



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

    if (!activeLocationId || activeLocationId === 'ALL') return;

    try {

      const token = localStorage.getItem('whiz-token');

      const API_BASE_URL = getApiBaseUrl();

      const res = await fetch(`${API_BASE_URL}/api/outlets/${activeLocationId}`, {

        headers: { 'Authorization': `Bearer ${token}` }

      });

      if (res.ok) {

        const data = await res.json();

        setOutlets(Array.isArray(data) ? data : []);

      }

    } catch (e) {

      console.error(e);

    }

  };



  const fetchProducts = async () => {

    const token = localStorage.getItem('whiz-token');

    try {

      setIsRefreshing(true);

      const API_BASE_URL = getApiBaseUrl();

      let queryParams = [];

      if (activeLocationId !== 'ALL') queryParams.push(`locationId=${activeLocationId}`);

      if (selectedOutletId !== 'ALL') queryParams.push(`outletId=${selectedOutletId}`);

      const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const res = await fetch(`${API_BASE_URL}/api/inventory${query}`, {

        headers: { 'Authorization': `Bearer ${token}` }

      });

      const data = await res.json();

      if (Array.isArray(data)) {

        setProducts(data);

        setCachedData(cacheKey, data);

      }

    } catch (err) {

      console.error(err);

    } finally {

      setIsRefreshing(false);

    }

  };



  useEffect(() => {

    fetchBizSettings();

    fetchOutlets();

  }, [activeLocationId]);



  useEffect(() => {

    // Show cached products immediately

    setProducts(getCachedData(cacheKey, []));

    fetchProducts();

  }, [activeLocationId, selectedOutletId, cacheKey]);



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

          locationId: activeLocationId === 'ALL' ? null : activeLocationId,

          outletId: selectedOutletId === 'ALL' ? null : selectedOutletId

        })

      });



      if (res.ok) {

        toast.success(`Added ${quickAddQty} items to stock!`);

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



  return (

    <div className="space-y-4 animate-in px-4 py-4 md:p-6">

      {/* Central Store Context Banner */}

      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-sm text-blue-900 dark:text-blue-200 shadow-sm">

        <div className="flex items-center gap-3">

          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">

            <Warehouse className="w-5 h-5" />

          </div>

          <div>

            <div className="font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2 flex-wrap">

              Central Store & Warehouse Receiving

              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">

                Primary Supply Pool

              </span>

            </div>

            <p className="text-xs text-blue-700 dark:text-blue-300/80 mt-0.5">

              Incoming supplier deliveries enter Central Store. Distribute stock to POS terminals via{' '}

              <Link to="/dashboard/outlets" className="underline font-semibold hover:text-blue-950 dark:hover:text-blue-100">

                Outlets & Terminals

              </Link>.

            </p>

          </div>

        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button 
            onClick={openReceiveModal}
            className="w-full sm:w-auto justify-center btn btn-sm bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 shadow-sm rounded-xl py-2 px-3.5 cursor-pointer"

          >

            <PackageCheck className="w-4 h-4" /> Receive Delivery (GRN)

          </button>

        </div>

      </div>

      <section className="section">

        <div className="section-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="section-title text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Inventory & Products</h2>
            <p className="section-desc text-xs sm:text-sm text-slate-500 dark:text-slate-400">Manage your product catalog, stock levels, and categories.</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button 
              onClick={handleExport}
              className="btn btn-secondary btn-sm inline-flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 
              <span>Export</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary btn-sm inline-flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"
            >
              <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" /> 
              <span>Import</span>
            </button>
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="btn btn-secondary btn-sm inline-flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" /> 
              <span>Transfer</span>
            </button>
            <button onClick={handleNew} className="btn btn-primary btn-sm inline-flex items-center justify-center gap-1.5 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" /> 
              <span>New Product</span>
            </button>
          </div>
        </div>



        <div className="glass-panel overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
              <div className="search-box flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  placeholder="Search SKU, barcode or name..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="w-full sm:w-auto py-2 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  title="Filter inventory for Central Warehouse or specific outlet registers"
                >
                  <option value="ALL">All Stock (Consolidated)</option>
                  <option value="CENTRAL">Central Warehouse / Store</option>
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>Outlet: {o.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar sm:flex-wrap">
              {['All Categories', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized')))].map((c: string) => (
                <button 
                  key={c} 
                  onClick={() => setSelectedCategory(c)}
                  className={`chip px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === c 
                      ? 'bg-blue-600 text-white shadow-sm font-semibold' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-white/5'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block table-scroll">

            <table className="data-table">

              <thead>

                <tr>

                  <th>SKU</th>

                  <th>Name</th>

                  <th>Category</th>

                  <th className="font-tabular text-right">Price (KES)</th>

                  <th className="font-tabular text-right">In-Store Stock</th>

                  <th className="font-tabular text-right">Total Stock</th>

                  <th className="text-right">Actions</th>

                </tr>

              </thead>

              <tbody>

                {products.length > 0 ? (

                  products

                    .filter(p => selectedCategory === 'All Categories' || (p.category || 'Uncategorized') === selectedCategory)

                    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))

                    .map(p => (

                    <tr key={p.id}>

                      <td className="font-mono text-xs text-[color:var(--text-muted)]">{p.sku}</td>

                      <td>

                        <div className="flex items-center gap-2.5">

                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color:var(--accent-primary-soft)] text-[color:var(--accent-primary)]">

                            <Package className="w-4 h-4" />

                          </div>

                          <span className="font-semibold">{p.name}</span>

                        </div>

                      </td>

                      <td className="text-[color:var(--text-secondary)]">{p.category || 'Uncategorized'}</td>

                      <td className="font-tabular font-semibold text-right">{p.price.toLocaleString()}</td>

                      <td className="py-3 px-4 text-right">

                        <span className={`font-semibold ${p.inStoreStock <= p.reorderLevel ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>

                          {p.inStoreStock}

                        </span>

                      </td>

                      <td className="py-3 px-4">

                        <div className="flex items-center justify-end gap-2">

                          <span className={`font-semibold ${p.totalStock <= p.reorderLevel ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-cyan-400'}`}>

                            {p.totalStock}

                          </span>

                          <button 

                            onClick={() => handleQuickAdd(p.id)}

                            className="p-1 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"

                            title="Quick Add Stock"

                          >

                            <Plus className="w-4 h-4" />

                          </button>

                        </div>

                      </td>

                      <td className="text-right">

                        <div className="flex items-center justify-end gap-1">

                          <button onClick={() => handleEdit(p)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">

                            <Edit2 className="w-4 h-4" />

                          </button>

                          <button onClick={() => handleDelete(p.id)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500">

                            <Trash2 className="w-4 h-4" />

                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td colSpan={7} className="text-center py-8 text-[color:var(--text-muted)]">

                      {isRefreshing ? 'Fetching latest inventory...' : 'No products found. Add your first product!'}

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

          

          <div className="md:hidden p-3 space-y-3">
            {products.length > 0 ? (
              products
                .filter(p => selectedCategory === 'All Categories' || (p.category || 'Uncategorized') === selectedCategory)
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                  <div 
                    key={p.id} 
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col gap-3 transition-all hover:border-slate-300 dark:hover:border-white/20"
                  >
                    {/* Top Row: Name, SKU, Category, and Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-cyan-400 mt-0.5">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {p.sku}
                            </span>
                            {p.category && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                                {p.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-tabular font-bold text-base text-emerald-600 dark:text-emerald-400">
                          {Number(p.price || 0).toLocaleString()} <span className="text-[11px] font-normal text-slate-500">KES</span>
                        </div>
                        {p.costPrice > 0 && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            Cost: {Number(p.costPrice).toLocaleString()} KES
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stock Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-white/5 text-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          In-Store
                        </span>
                        <span className={`text-xs font-bold mt-0.5 ${p.inStoreStock <= p.reorderLevel ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {p.inStoreStock ?? 0}
                        </span>
                      </div>

                      <div className="flex flex-col border-x border-slate-200/60 dark:border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Central
                        </span>
                        <span className="text-xs font-bold mt-0.5 text-blue-600 dark:text-cyan-400">
                          {p.storeStock ?? (Math.max(0, (p.totalStock ?? 0) - (p.inStoreStock ?? 0)))}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Total Stock
                        </span>
                        <span className={`text-xs font-bold mt-0.5 ${p.totalStock <= p.reorderLevel ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                          {p.totalStock ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 gap-2">
                      <button
                        onClick={() => handleQuickAdd(p.id)}
                        className="flex-1 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold text-xs inline-flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800/60 transition-colors"
                        title="Quick Add Stock"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Add Stock</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEdit(p)}
                          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-xs inline-flex items-center gap-1 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDelete(p.id)}
                          className="h-9 w-9 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 inline-flex items-center justify-center transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs">
                No products found matching your filter.
              </div>
            )}
          </div>
        </div>
      </section>



      <StockTransferModal 

        isOpen={isTransferModalOpen}

        onClose={() => setIsTransferModalOpen(false)}

        products={products}

        onTransferComplete={fetchProducts}

      />

      

      <ProductModal

        isOpen={isProductModalOpen}

        onClose={() => setIsProductModalOpen(false)}

        product={selectedProduct}

        onComplete={fetchProducts}

      />

      

      <Modal isOpen={!!quickAddProduct} onClose={() => setQuickAddProduct(null)} title="Quick Add Stock">

        <form onSubmit={submitQuickAdd} className="space-y-4 mt-2">

          <div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Quantity to add</label>
            <input 
              type="number" 
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/15 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-tabular font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500" 

              value={quickAddQty} 

              onChange={e => setQuickAddQty(e.target.value)} 

              placeholder="e.g. 50"

              autoFocus

            />

          </div>

          <div className="flex justify-end gap-2 pt-2">

            <button type="button" onClick={() => setQuickAddProduct(null)} className="btn btn-ghost text-slate-600 dark:text-slate-300">Cancel</button>

            <button type="submit" className="btn btn-primary rounded-xl shadow-md">Add Stock</button>

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

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">

                Goods Receiving Destination

              </label>

              <div className="grid grid-cols-2 gap-2 text-sm">

                <button

                  type="button"

                  onClick={() => setReceiveDestination('STORE')}

                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${

                    receiveDestination === 'STORE' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-semibold shadow-sm' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'

                  }`}

                >

                  <Store className="w-4 h-4 text-blue-600 shrink-0" />

                  <span>Central Store / Warehouse</span>

                </button>

                <button

                  type="button"

                  onClick={() => setReceiveDestination('SHARED')}

                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${

                    receiveDestination === 'SHARED' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold shadow-sm' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'

                  }`}

                >

                  <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />

                  <span>Direct to Active Inventory</span>

                </button>

              </div>

            </div>

          ) : (

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">

              <Boxes className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />

              <span>

                <strong>Direct-to-Inventory Mode:</strong> Goods received will immediately be credited into active selling stock across all registers without requiring a store holding stage.

              </span>

            </div>

          )}



          {/* Product Selection Section */}

          <div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Select Product to Receive *</label>



            {selectedReceiveProduct ? (

              /* Selected Product Card */

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">

                <div className="flex items-center gap-3 min-w-0">

                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">

                    <Check className="w-5 h-5" />

                  </div>

                  <div className="min-w-0">

                    <div className="font-bold text-slate-900 dark:text-white text-base truncate">

                      {selectedReceiveProduct.name}

                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 mt-0.5">

                      <span className="font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10">

                        SKU: {selectedReceiveProduct.sku}

                      </span>

                      {selectedReceiveProduct.barcode && (

                        <span className="font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 flex items-center gap-1">

                          <Barcode className="w-3 h-3 text-gray-500" />

                          {selectedReceiveProduct.barcode}

                        </span>

                      )}

                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700/50">

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

                  className="btn btn-sm btn-secondary bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl shrink-0 inline-flex items-center gap-1"

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

                    className="w-full pl-9 pr-8 py-2.5 border-2 border-blue-300 dark:border-blue-700/60 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"

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

                <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-inner max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">

                  {receiveMatchingProducts.length > 0 ? (

                    receiveMatchingProducts.slice(0, 50).map(p => (

                      <div

                        key={p.id}

                        onClick={() => handleSelectReceiveProduct(p)}

                        className="p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between gap-3 transition-colors"

                      >

                        <div className="min-w-0">

                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">

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

                            <div className="font-bold text-xs text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">

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

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Quantity Received (Units) *</label>
              <input
                ref={receiveQtyInputRef}
                type="number"
                required
                min="1"
                placeholder="e.g. 100"
                value={receiveForm.quantity}
                onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-white/15 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">New Cost Price (Optional, KES)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 450.00"
                value={receiveForm.costPrice}
                onChange={e => setReceiveForm({ ...receiveForm, costPrice: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-white/15 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>



          <div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">Supplier Delivery Note / Invoice Ref</label>
            <input
              type="text"
              placeholder="e.g. Invoice #9823 / Brookside Dairy"
              value={receiveForm.referenceNote}
              onChange={e => setReceiveForm({ ...receiveForm, referenceNote: e.target.value })}
              className="w-full p-2.5 border border-slate-300 dark:border-white/15 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>



          <div className="flex justify-end gap-2 pt-3 border-t">

            <button 
              type="button" 
              onClick={() => setIsReceiveModalOpen(false)} 
              className="btn btn-ghost text-slate-600 dark:text-slate-300 rounded-xl"

              disabled={isReceiving}

            >

              Cancel

            </button>

            <button 

              type="submit" 

              className="btn btn-primary inline-flex items-center gap-1.5 rounded-xl shadow-md"

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









