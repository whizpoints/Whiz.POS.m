import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Product } from '../types';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Edit2, Trash2, Search, Filter, ClipboardCheck, X, Camera } from 'lucide-react';
import cartPlaceholder from '../assets/cart.png';
import toast from 'react-hot-toast';

export default function InventoryManagement() {
  const { products, updateProduct, addProduct, deleteProduct, categories: storeCategories } = usePosStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReconcileMode, setIsReconcileMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: storeCategories[0] || 'Others',
    image: '',
    stock: '',
    minStock: '10',
    available: true,
    expiryDate: '',
    batchNumber: '',
    supplier: ''
  });

  // State for Reconciliation
  const [reconciliationData, setReconciliationData] = useState<{ [id: number]: number }>({});

  const categories = ['all', ...new Set([...storeCategories, ...products.map(p => p.category)])];
  const productNames = [...new Set(products.map(p => p.name).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = filteredProducts.filter(product => 
    product.stock !== undefined && product.stock <= (product.minStock || 10)
  );

  const outOfStockProducts = filteredProducts.filter(product => 
    product.stock === 0
  );

  const totalStockValue = filteredProducts.reduce((sum, product) => 
    sum + (product.price * (product.stock || 0)), 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      image: formData.image,
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      available: formData.available,
      expiryDate: formData.expiryDate || undefined,
      batchNumber: formData.batchNumber || undefined,
      supplier: formData.supplier || undefined
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct({ ...productData, id: Math.random().toString(36).substr(2, 9) });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      category: 'Coffee',
      image: '',
      stock: '',
      minStock: '10',
      available: true,
      expiryDate: '',
      batchNumber: '',
      supplier: ''
    });
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      image: product.image,
      stock: (product.stock || 0).toString(),
      minStock: (product.minStock || 10).toString(),
      available: product.available,
      expiryDate: product.expiryDate || '',
      batchNumber: product.batchNumber || '',
      supplier: product.supplier || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const toggleAvailability = (product: Product) => {
    updateProduct(product.id, { available: !product.available });
  };

  // Reconciliation Logic
  const handleReconcileChange = (productId: number, value: string) => {
      const count = parseInt(value);
      if (!isNaN(count)) {
          setReconciliationData(prev => ({ ...prev, [productId]: count }));
      }
  };

  const submitReconciliation = () => {
      if (confirm("This will update the stock levels for all modified items. Continue?")) {
          Object.entries(reconciliationData).forEach(([id, count]) => {
              const productId = parseInt(id) || id; // Handle string/number ID mismatch if any
              // Ideally updateProduct should handle ID type correctly.
              // Product ID in interface is number, but some logic uses string.
              // Let's assume it matches the type in store.
              // Casting id to number if product.id is number
              const product = products.find(p => p.id == productId);
              if (product) {
                  updateProduct(product.id, { stock: count });
                  // Log adjustment? For now, updating stock is sufficient for MVP.
              }
          });
          setReconciliationData({});
          setIsReconcileMode(false);
          toast.success("Stock levels updated successfully.");
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <p className="text-gray-600">Manage products and stock levels</p>
              </div>
            </div>
            <div className="flex space-x-3">
                <button
                    onClick={() => setIsReconcileMode(!isReconcileMode)}
                    className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                        isReconcileMode
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                    <ClipboardCheck className="w-5 h-5" />
                    <span>{isReconcileMode ? 'Exit Reconciliation' : 'Stock Reconciliation'}</span>
                </button>
                {!isReconcileMode && (
                    <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                    <Plus className="w-5 h-5" />
                    <span>Add Product</span>
                    </button>
                )}
            </div>
          </div>
        </div>

        {/* Summary Cards (Hidden in Reconciliation Mode to focus) */}
        {!isReconcileMode && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Total Products</p>
                    <p className="text-2xl font-bold text-gray-800">{filteredProducts.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Low Stock</p>
                    <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Stock Value</p>
                    <p className="text-2xl font-bold text-green-600">KES {totalStockValue.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
            </div>
            </div>
        )}

        {/* Alerts */}
        {!isReconcileMode && (lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Stock Alerts</h3>
            {outOfStockProducts.length > 0 && (
              <div className="mb-4">
                <p className="text-red-800 font-medium mb-2">Out of Stock:</p>
                <div className="flex flex-wrap gap-2">
                  {outOfStockProducts.map(product => (
                    <span key={product.id} className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">
                      {product.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lowStockProducts.length > 0 && (
              <div>
                <p className="text-orange-800 font-medium mb-2">Low Stock:</p>
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.map(product => (
                    <span key={product.id} className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm">
                      {product.name} ({product.stock})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                list="inventory-suggestions"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <datalist id="inventory-suggestions">
                  {productNames.map(name => <option key={name} value={name} />)}
              </datalist>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reconciliation Actions */}
        {isReconcileMode && (
            <div className="bg-purple-50 p-4 rounded-lg mb-6 flex justify-between items-center border border-purple-200">
                <div>
                    <h3 className="font-bold text-purple-900">Stock Reconciliation Mode</h3>
                    <p className="text-sm text-purple-700">Enter physical counts below. Variance will be calculated automatically.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => { setReconciliationData({}); setIsReconcileMode(false); }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submitReconciliation}
                        className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold"
                    >
                        Submit Adjustments
                    </button>
                </div>
            </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  {!isReconcileMode && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Stock</th>
                  {isReconcileMode ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                      </>
                  ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier/Batch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.image ? `local-asset://${product.image}` : cartPlaceholder}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {!isReconcileMode && <div className="text-sm text-gray-500">ID: {product.id}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    {!isReconcileMode && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {product.price.toFixed(2)}
                        </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        !isReconcileMode && product.stock === 0 ? 'text-red-600' :
                        !isReconcileMode && product.stock <= (product.minStock || 10) ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {product.stock || 0}
                      </span>
                    </td>

                    {isReconcileMode ? (
                        <>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                    type="number"
                                    min="0"
                                    className="w-24 p-2 border rounded focus:ring-2 focus:ring-purple-500"
                                    value={reconciliationData[product.id] !== undefined ? reconciliationData[product.id] : ''}
                                    onChange={(e) => handleReconcileChange(product.id, e.target.value)}
                                    placeholder={product.stock?.toString()}
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold">
                                {reconciliationData[product.id] !== undefined ? (
                                    <span className={reconciliationData[product.id] - (product.stock || 0) < 0 ? 'text-red-600' : 'text-green-600'}>
                                        {reconciliationData[product.id] - (product.stock || 0) > 0 ? '+' : ''}
                                        {reconciliationData[product.id] - (product.stock || 0)}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">-</span>
                                )}
                            </td>
                        </>
                    ) : (
                        <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{product.supplier || 'N/A'}</div>
                              {(product.batchNumber || product.expiryDate) && (
                                <div className="text-xs text-gray-500">
                                  {product.batchNumber && `B: ${product.batchNumber} `}
                                  {product.expiryDate && `Exp: ${product.expiryDate}`}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <button
                                onClick={() => toggleAvailability(product)}
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                product.available
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                            >
                                {product.available ? 'Available' : 'Unavailable'}
                            </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                                <button
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-800"
                                >
                                <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-800"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            </td>
                        </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Product Modal - Modernized */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
              <div className="sticky top-0 bg-white/95 backdrop-blur-md px-8 py-5 border-b border-gray-100 flex justify-between items-center z-10">
                <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                  {editingProduct ? 'Edit Product Details' : 'Create New Product'}
                </h2>
                <button 
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Product Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                        placeholder="Enter product name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Price (KES)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-4 text-gray-400 font-bold">KES</span>
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full p-4 pl-14 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-900"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full p-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium appearance-none"
                      >
                        {storeCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stock & Supplier */}
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-6">
                    <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest flex items-center">
                      <Package className="w-4 h-4 mr-2" /> Stock & Supply
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Current Stock</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.stock}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Min. Alert Level</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.minStock}
                          onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          placeholder="10"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Supplier</label>
                        <input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          placeholder="Supplier Name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Batch Number</label>
                        <input
                          type="text"
                          value={formData.batchNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                          placeholder="e.g. BATCH-2024"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Expiry Date</label>
                        <input
                          type="date"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Media & Options */}
                  <div className="flex flex-col md:flex-row gap-6 items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="relative group cursor-pointer w-24 h-24 flex-shrink-0">
                      <img
                        src={formData.image ? `local-asset://${formData.image}` : cartPlaceholder}
                        alt="Product Preview"
                        className="w-full h-full object-cover rounded-2xl shadow-sm border border-gray-200 transition-transform group-hover:scale-105"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            if (window.electron) {
                              const result = await window.electron.saveImage(file.path);
                              if (result.success && result.fileName) {
                                setFormData(prev => ({ ...prev, image: result.fileName }));
                              }
                            } else {
                              const imageURL = URL.createObjectURL(file);
                              setFormData(prev => ({ ...prev, image: imageURL }));
                            }
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="text-white w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800 mb-1">Product Image</p>
                      <p className="text-xs text-gray-500 mb-4">Click the image to upload a new one. PNG, JPG up to 5MB.</p>
                      
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={formData.available}
                            onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                            className="peer sr-only"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                          Available for Sale
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-4 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5"
                    >
                      {editingProduct ? 'Save Changes' : 'Create Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
