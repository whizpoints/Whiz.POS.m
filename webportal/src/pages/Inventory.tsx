import { useState, useEffect, useRef } from 'react';
import { Search, Package, Plus, Edit2, Trash2, ArrowRightLeft, FileUp, Download } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import StockTransferModal from '../components/Inventory/StockTransferModal';
import ProductModal from '../components/Inventory/ProductModal';
import ExcelUploadModal from '../components/Inventory/ExcelUploadModal';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProductUploadOpen, setIsProductUploadOpen] = useState(false);
  const [isAuditUploadOpen, setIsAuditUploadOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeLocationId } = useBranchContext();

  useEffect(() => {
    fetchProducts();
  }, [activeLocationId]);

  const fetchProducts = async () => {
    const token = localStorage.getItem('whiz-token');
    try {
      setLoading(true);
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
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
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
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

  const handleQuickAdd = async (productId: string) => {
    const qty = prompt("Enter quantity to add to stock:");
    if (!qty || isNaN(Number(qty))) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
      const res = await fetch(`${API_BASE_URL}/api/inventory/quick-add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          quantity: Number(qty),
          locationId: activeLocationId === 'ALL' ? null : activeLocationId
        })
      });

      if (res.ok) {
        toast.success(`Added ${qty} items to stock!`);
        fetchProducts();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to add stock');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const downloadProductTemplate = () => {
    const token = localStorage.getItem('whiz-token');
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
    window.open(`${API_BASE_URL}/api/inventory/template/products?token=${token}`, '_blank');
  };

  const downloadAuditTemplate = () => {
    const token = localStorage.getItem('whiz-token');
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
    const query = activeLocationId === 'ALL' ? '' : `&locationId=${activeLocationId}`;
    window.open(`${API_BASE_URL}/api/inventory/template/reconciliation?token=${token}${query}`, '_blank');
  };

  return (
    <div className="space-y-4 animate-in p-6">
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Inventory & Products</h2>
            <p className="section-desc">Manage your product catalog, stock levels, and categories.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadProductTemplate}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 text-green-600" /> Products Template
            </button>
            <button 
              onClick={() => setIsProductUploadOpen(true)}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <FileUp className="w-4 h-4 text-blue-600" /> Upload Products
            </button>
            <button 
              onClick={downloadAuditTemplate}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 text-purple-600" /> Stock Audit Template
            </button>
            <button 
              onClick={() => setIsAuditUploadOpen(true)}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <FileUp className="w-4 h-4 text-orange-600" /> Upload Audit
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
              <input placeholder="Search SKU, barcode or name..." />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['All', 'Low Stock', 'Out of Stock'].map((c, i) => (
                <button key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</button>
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
                  <th className="font-tabular text-right">Stock</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                ) : products.length > 0 ? (
                  products.map(p => (
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
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-semibold ${p.stock <= 5 ? 'text-red-600' : 'text-gray-900'}`}>
                            {p.stock}
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
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

  const handleQuickAdd = async (productId: string) => {
    const qty = prompt("Enter quantity to add to stock:");
    if (!qty || isNaN(Number(qty))) return;

    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
      const res = await fetch(`${API_BASE_URL}/api/inventory/quick-add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          quantity: Number(qty),
          locationId: activeLocationId === 'ALL' ? null : activeLocationId
        })
      });

      if (res.ok) {
        toast.success(`Added ${qty} items to stock!`);
        fetchProducts();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to add stock');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const downloadProductTemplate = () => {
    const token = localStorage.getItem('whiz-token');
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
    window.open(`${API_BASE_URL}/api/inventory/template/products?token=${token}`, '_blank');
  };

  const downloadAuditTemplate = () => {
    const token = localStorage.getItem('whiz-token');
    const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : '';
    const query = activeLocationId === 'ALL' ? '' : `&locationId=${activeLocationId}`;
    window.open(`${API_BASE_URL}/api/inventory/template/reconciliation?token=${token}${query}`, '_blank');
  };

  return (
    <div className="space-y-4 animate-in p-6">
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Inventory & Products</h2>
            <p className="section-desc">Manage your product catalog, stock levels, and categories.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadProductTemplate}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 text-green-600" /> Products Template
            </button>
            <button 
              onClick={() => setIsProductUploadOpen(true)}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <FileUp className="w-4 h-4 text-blue-600" /> Upload Products
            </button>
            <button 
              onClick={downloadAuditTemplate}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4 text-purple-600" /> Stock Audit Template
            </button>
            <button 
              onClick={() => setIsAuditUploadOpen(true)}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <FileUp className="w-4 h-4 text-orange-600" /> Upload Audit
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
              <input placeholder="Search SKU, barcode or name..." />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {['All', 'Low Stock', 'Out of Stock'].map((c, i) => (
                <button key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</button>
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
                  <th className="font-tabular text-right">Stock</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                ) : products.length > 0 ? (
                  products.map(p => (
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
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-semibold ${p.stock <= 5 ? 'text-red-600' : 'text-gray-900'}`}>
                            {p.stock}
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
                    <td colSpan={6} className="text-center py-8 text-[color:var(--text-muted)]">
                      No products found. Add your first product!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <StockTransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} products={products} onTransferComplete={fetchProducts} />
      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} product={selectedProduct} onComplete={fetchProducts} />
      <ExcelUploadModal 
        isOpen={isProductUploadOpen} 
        onClose={() => setIsProductUploadOpen(false)} 
        title="Upload Products Bulk File"
        description="Upload the generated Excel template with your products to bulk-insert or update them based on SKU. Categories missing will default to General."
        uploadEndpoint="/api/inventory/import/products"
        onSuccess={fetchProducts}
      />
      <ExcelUploadModal 
        isOpen={isAuditUploadOpen} 
        onClose={() => setIsAuditUploadOpen(false)} 
        title="Upload Stock Adjustments"
        description="Upload the Reconciliation Excel template. The server will calculate absolute stock dynamically using your relative (+/-) inputs to prevent counting errors."
        uploadEndpoint="/api/inventory/import/reconciliation"
        onSuccess={fetchProducts}
      />
    </div>
  );
}
