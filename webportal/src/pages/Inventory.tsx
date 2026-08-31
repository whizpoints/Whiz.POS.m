import { useState, useEffect, useRef } from 'react';
import { Search, Package, Plus, Edit2, Trash2, ArrowRightLeft, FileUp, Download } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import { getApiBaseUrl } from '../lib/utils';
import StockTransferModal from '../components/Inventory/StockTransferModal';
import ProductModal from '../components/Inventory/ProductModal';
import { Modal } from '../components/ui/modal';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quickAddProduct, setQuickAddProduct] = useState<string | null>(null);
  const [quickAddQty, setQuickAddQty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    fetchProducts();
  }, [activeLocationId]);

  const fetchProducts = async () => {
    const token = localStorage.getItem('whiz-token');
    try {
      setLoading(true);
      const API_BASE_URL = getApiBaseUrl();
      const query = activeLocationId === 'ALL' ? '' : `?locationId=${activeLocationId}`;
      const res = await fetch(`${API_BASE_URL}/api/inventory${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
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

  return (
    <div className="space-y-4 animate-in px-4 py-4 md:p-6">
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Inventory & Products</h2>
            <p className="section-desc">Manage your product catalog, stock levels, and categories.</p>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="flex items-center justify-between gap-3 p-3 border-b border-[color:var(--border-glass)]">
            <div className="search-box flex-1 max-w-md" style={{ minWidth: 0 }}>
              <Search />
              <input 
                placeholder="Search SKU, barcode or name..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['All Categories', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized')))].map((c: string) => (
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
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                ) : products.length > 0 ? (
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
                        <span className={`font-semibold ${p.inStoreStock <= p.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                          {p.inStoreStock}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-semibold ${p.totalStock <= p.reorderLevel ? 'text-red-600' : 'text-blue-600'}`}>
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
                      No products found. Add your first product!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="md:hidden divide-y divide-[color:var(--border-glass)]">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : products.length > 0 ? (
              products
                .filter(p => selectedCategory === 'All Categories' || (p.category || 'Uncategorized') === selectedCategory)
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color:var(--accent-primary-soft)] text-[color:var(--accent-primary)]">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="font-mono text-xs text-[color:var(--text-muted)]">{p.sku}</div>
                        </div>
                      </div>
                      <div className="font-tabular font-semibold text-right">{p.price.toLocaleString()} KES</div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm text-[color:var(--text-secondary)]">{p.category || 'Uncategorized'}</div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">In-Store</span>
                          <span className={`font-semibold ${p.inStoreStock <= p.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                            {p.inStoreStock}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Total</span>
                          <span className={`font-semibold ${p.totalStock <= p.reorderLevel ? 'text-red-600' : 'text-blue-600'}`}>
                            {p.totalStock}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[color:var(--border-glass)]">
                      <button 
                        onClick={() => handleQuickAdd(p.id)}
                        className="btn btn-icon btn-ghost btn-sm text-blue-600"
                        title="Quick Add Stock"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(p)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="btn btn-icon btn-ghost btn-sm text-[color:var(--text-muted)] hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-[color:var(--text-muted)]">
                No products found. Add your first product!
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to add</label>
            <input 
              type="number" 
              required
              className="w-full p-2 border rounded-lg" 
              value={quickAddQty} 
              onChange={e => setQuickAddQty(e.target.value)} 
              placeholder="e.g. 50"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setQuickAddProduct(null)} className="btn btn-ghost">Cancel</button>
            <button type="submit" className="btn btn-primary">Add Stock</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
