import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { PurchaseOrder, Supplier } from '../store/posStore';
import { 
  PackageSearch, Truck, FileText, Plus, FileCheck, Search, Filter, Box, User, ArrowDownToLine, CreditCard, ChevronRight
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import toast from 'react-hot-toast';

export default function ProcurementPage() {
  const { 
    purchaseOrders, suppliers, products, addPurchaseOrder, updatePurchaseOrder, 
    deletePurchaseOrder, receivePurchaseOrder, addSupplier 
  } = usePosStore();

  const [activeTab, setActiveTab] = useState<'pos' | 'grn' | 'suppliers'>('pos');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  
  // PO Form State
  const [poForm, setPoForm] = useState<{
    supplierId: string;
    dateExpected: string;
    items: { productId: number; productName: string; quantity: number; costPrice: number }[];
    notes: string;
  }>({
    supplierId: '',
    dateExpected: '',
    items: [],
    notes: ''
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');

  const handleAddPoItem = () => {
    if (!selectedProduct || !quantity || !costPrice) return;
    const product = products.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    setPoForm(prev => ({
      ...prev,
      items: [
        ...prev.items, 
        { productId: product.id, productName: product.name, quantity: parseInt(quantity), costPrice: parseFloat(costPrice) }
      ]
    }));
    setSelectedProduct('');
    setQuantity('');
    setCostPrice('');
  };

  const handleCreatePO = () => {
    if (!poForm.supplierId || poForm.items.length === 0) return toast.error('Select a supplier and add at least one item.');
    const supplier = suppliers.find(s => s.id === poForm.supplierId);
    if (!supplier) return;

    const totalAmount = poForm.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    const newPO: PurchaseOrder = {
      id: `PO-${Math.floor(Math.random() * 100000)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: 'ordered',
      dateCreated: new Date().toISOString(),
      dateExpected: poForm.dateExpected,
      items: poForm.items,
      totalAmount,
      notes: poForm.notes
    };

    addPurchaseOrder(newPO);
    setIsPoModalOpen(false);
    setPoForm({ supplierId: '', dateExpected: '', items: [], notes: '' });
  };

  const handleReceivePO = (poId: string) => {
    if (confirm('Mark this Purchase Order as RECEIVED? This will instantly increase your inventory stock levels.')) {
      receivePurchaseOrder(poId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Truck className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Procurement & Receivables</h1>
              <p className="text-gray-600">Manage suppliers, purchase orders, and goods received</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'pos' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-5 h-5 mr-2" /> Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('grn')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'grn' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileCheck className="w-5 h-5 mr-2" /> Goods Received Notes (GRN)
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'suppliers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <User className="w-5 h-5 mr-2" /> Suppliers
            </button>
          </div>
        </div>

        {/* Purchase Orders View */}
        {activeTab === 'pos' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Purchase Orders</h2>
              <button onClick={() => setIsPoModalOpen(true)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                <Plus className="w-5 h-5 mr-2" /> Create PO
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-blue-600">{po.id}</td>
                      <td className="px-6 py-4 font-medium">{po.supplierName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          po.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {po.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(po.dateCreated).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">KES {po.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {po.status === 'ordered' && (
                          <button onClick={() => handleReceivePO(po.id)} className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded hover:bg-emerald-200 transition-colors">
                            Receive Goods
                          </button>
                        )}
                        {po.status === 'received' && (
                           <span className="text-sm text-gray-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No purchase orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Goods Received Notes View */}
        {activeTab === 'grn' && (
           <div className="bg-white rounded-lg shadow-sm p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-blue-600"/> Received Goods (GRN Ledger)</h2>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-gray-50 border-b">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Reference</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Received</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {purchaseOrders.filter(po => po.status === 'received').map(po => (
                     <tr key={po.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 font-medium text-gray-800">{po.id}</td>
                       <td className="px-6 py-4 font-medium">{po.supplierName}</td>
                       <td className="px-6 py-4 text-sm text-gray-500">{new Date(po.dateCreated).toLocaleDateString()}</td>
                       <td className="px-6 py-4 text-sm text-gray-600">
                         {po.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                       </td>
                       <td className="px-6 py-4 font-bold text-gray-800">KES {po.totalAmount.toLocaleString()}</td>
                     </tr>
                   ))}
                   {purchaseOrders.filter(po => po.status === 'received').length === 0 && (
                     <tr><td colSpan={5} className="text-center py-8 text-gray-500">No goods received yet.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        )}

        {/* Suppliers View */}
        {activeTab === 'suppliers' && (
           <div className="bg-white rounded-lg shadow-sm p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-semibold text-gray-800">Supplier Directory</h2>
               <button onClick={() => toast.success('Supplier modal coming soon')} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                 <Plus className="w-5 h-5 mr-2" /> Add Supplier
               </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {suppliers.map(supplier => (
                  <div key={supplier.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                      {supplier.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{supplier.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{supplier.location}</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between"><span>Contact:</span> <span className="font-medium">{supplier.contact}</span></div>
                      <div className="flex justify-between"><span>Status:</span> <span className={`font-medium ${supplier.active ? 'text-green-600' : 'text-red-600'}`}>{supplier.active ? 'Active' : 'Inactive'}</span></div>
                    </div>
                  </div>
               ))}
               {suppliers.length === 0 && (
                 <div className="col-span-3 text-center py-8 text-gray-500">No suppliers found.</div>
               )}
             </div>
           </div>
        )}

      </div>

      {/* PO Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-800">Create Purchase Order</h2>
              <button onClick={() => setIsPoModalOpen(false)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Select Supplier</label>
                  <select value={poForm.supplierId} onChange={(e) => setPoForm({...poForm, supplierId: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Expected Delivery Date</label>
                  <input type="date" value={poForm.dateExpected} onChange={(e) => setPoForm({...poForm, dateExpected: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wide">Add Items to Order</h3>
                <div className="flex gap-3">
                  <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 p-3 border border-gray-300 rounded-lg">
                    <option value="">-- Select Product --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (In Stock: {p.stock || 0})</option>)}
                  </select>
                  <input type="number" placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-24 p-3 border border-gray-300 rounded-lg" />
                  <input type="number" placeholder="Unit Cost" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-32 p-3 border border-gray-300 rounded-lg" />
                  <button onClick={handleAddPoItem} className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700">Add</button>
                </div>
              </div>

              {poForm.items.length > 0 && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-800 text-left">
                      <th className="py-2 text-sm font-bold">Item</th>
                      <th className="py-2 text-sm font-bold">Qty</th>
                      <th className="py-2 text-sm font-bold">Unit Cost</th>
                      <th className="py-2 text-sm font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poForm.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-3 text-sm">{item.productName}</td>
                        <td className="py-3 text-sm">{item.quantity}</td>
                        <td className="py-3 text-sm">KES {item.costPrice.toLocaleString()}</td>
                        <td className="py-3 text-sm text-right font-bold">KES {(item.quantity * item.costPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="py-4 text-right font-bold text-lg">Order Total:</td>
                      <td className="py-4 text-right font-black text-xl text-blue-600">
                        KES {poForm.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setIsPoModalOpen(false)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleCreatePO} className="px-6 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">Create & Send PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
