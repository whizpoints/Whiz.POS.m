import React from 'react';
import { usePosStore } from '../store/posStore';
import { Plus, X } from 'lucide-react';
import cartPlaceholder from '../assets/cart.png';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

const CART_PLACEHOLDER = cartPlaceholder;

/**
 * Component for displaying the grid of products.
 * Allows searching and adding products to the cart.
 */
export default function ProductGrid() {
  const { products, transactions, addToCart } = usePosStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const handleBarcodeScan = (code: string) => {
    // Attempt to find by exact barcode match first, then by exact string ID
    const product = products.find(p => (p.barcode && p.barcode === code) || p.id.toString() === code);
    if (product) {
        addToCart(product);
    }
  };

  useBarcodeScanner(handleBarcodeScan);

  // Calculate product popularity based on sales quantity
  const productSalesCount = React.useMemo(() => {
    const counts: Record<number, number> = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        if (item.product && item.product.id) {
          counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
        }
      });
    });
    return counts;
  }, [transactions]);

  // Deduplicate products to prevent React key warnings and display issues
  // We prioritize the most recent or complete data if possible, but here we just take the first valid occurrence
  const uniqueProducts = React.useMemo(() => {
    const seenIds = new Set();
    return products.filter(p => {
       if (!p || !p.id || String(p.id) === 'null' || String(p.id) === 'NaN') return false;
       if (seenIds.has(p.id)) return false;
       seenIds.add(p.id);
       return true;
    });
  }, [products]);

  const { categories: storeCategories } = usePosStore();

  // Extract unique categories that have at least one product
  const categories = React.useMemo(() => {
    const productCategories = new Set(uniqueProducts.map(p => p.category).filter(Boolean));
    // Filter storeCategories to only those that have at least one product
    const activeStoreCategories = storeCategories.filter(cat => productCategories.has(cat));
    const allCats = new Set(['All', ...activeStoreCategories]);
    return Array.from(allCats);
  }, [storeCategories, uniqueProducts]);
  const productNames = [...new Set(uniqueProducts.map(p => p.name))];

  const filteredProducts = uniqueProducts.filter((product) => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const productCategory = (product.category || 'Other').toLowerCase();
    const targetCategory = selectedCategory.toLowerCase();

    // Exact match or fallback for case sensitivity issues
    const matchesCategory = selectedCategory === 'All' ||
                            productCategory === targetCategory ||
                            product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
     // Sort by popularity (descending), then name (ascending)
     const idA = String(a.id);
     const idB = String(b.id);
     const countA = productSalesCount[idA] || productSalesCount[Number(idA)] || 0;
     const countB = productSalesCount[idB] || productSalesCount[Number(idB)] || 0;

     if (countB !== countA) {
       return countB - countA;
     }
     return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div id="product-grid" className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-full">
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Products</h2>
          <div className="relative">
            <input
              type="text"
              list="product-suggestions"
              placeholder="Search for products or scan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm) {
                  const term = searchTerm.trim().toLowerCase();
                  // Try to find exact match by barcode or name
                  const exactMatch = products.find(p => 
                    (p.barcode && p.barcode.toLowerCase() === term) ||
                    (p.name && p.name.toLowerCase() === term)
                  );
                  if (exactMatch) {
                    addToCart(exactMatch);
                    setSearchTerm(''); // Clear input after adding
                  }
                }
              }}
              className="border border-gray-300 rounded-lg px-4 py-2 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <datalist id="product-suggestions">
            {productNames.map((name, index) => <option key={`${name}-${index}`} value={name} />)}
          </datalist>
        </div>

        {/* Categories Tab */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-2">
        {filteredProducts.map((product) => {
          const isOutOfStock = product.stock !== undefined && product.stock !== null && product.stock <= 0;
          return (
          <div
            key={product.id}
            className={`bg-gray-50 rounded-lg p-4 hover:shadow-xl transition-shadow cursor-pointer border flex flex-col justify-between ${isOutOfStock ? 'border-red-200 opacity-60' : 'border-gray-200'}`}
            onClick={() => addToCart(product)}
          >
            <div>
              <div className="aspect-square bg-gray-200 rounded-md mb-3 flex items-center justify-center overflow-hidden relative">
                <img
                  // Prioritize remote URL, then local file path, then placeholder
                  src={product.image || product.localImage || CART_PLACEHOLDER}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Fallback to placeholder on error
                    if (target.src !== CART_PLACEHOLDER) {
                         target.src = CART_PLACEHOLDER;
                    }
                  }}
                />
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">OUT OF STOCK</span>
                  </div>
                )}
              </div>
              <h3 className="font-medium text-gray-800 text-sm mb-1">{product.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-blue-600">KES {product.price}</p>
                {product.stock !== undefined && product.stock !== null && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'No stock'}
                  </span>
                )}
              </div>
            </div>
            <button 
              className={`mt-3 w-full rounded-lg py-2.5 px-4 transition-colors flex items-center justify-center text-sm font-semibold ${isOutOfStock ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              disabled={isOutOfStock}
            >
              <Plus className="w-5 h-5 mr-2" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
