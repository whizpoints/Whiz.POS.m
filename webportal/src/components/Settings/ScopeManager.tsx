import { useState } from 'react';
import { Package, Plus, Trash2, Edit2, X } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export default function ScopeManager() {
  const { scopes, isLoading } = useBranchContext();
  const { confirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = await confirm({
      title: 'Delete Inventory Scope?',
      message: 'Are you sure you want to delete this scope? Branches using it will fall back to isolated inventory.',
      confirmText: 'Delete Scope'
    });
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/business/scopes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        toast.success('Scope deleted');
        window.location.reload();
      } else {
        toast.error('Failed to delete scope');
      }
    } catch (err) {
      toast.error('Error deleting scope');
    }
  };

  const handleEdit = (scope: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedScope(scope);
    setFormData({ name: scope.name, description: scope.description || '' });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedScope(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const url = selectedScope 
        ? `${API_BASE_URL}/api/business/scopes/${selectedScope.id}`
        : `${API_BASE_URL}/api/business/scopes`;
      const method = selectedScope ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(selectedScope ? 'Scope updated' : 'Scope created');
        setIsModalOpen(false);
        window.location.reload();
      } else {
        toast.error('Failed to save scope');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <div className="space-y-6 mt-12 pt-8 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Inventory Sharing Scopes</h3>
          <p className="text-sm text-slate-500">Create groups to share inventory levels across multiple branches.</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-white border border-sky-200 text-sky-600 hover:bg-sky-50 font-bold py-2.5 px-6 rounded-full flex items-center gap-2 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          Add Scope
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scopes.map((scope: any) => (
          <div 
            key={scope.id} 
            className="bg-white/60 p-6 rounded-[2rem] border border-slate-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-500 border border-indigo-100">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{scope.name}</h4>
                  <p className="text-xs text-slate-500">{scope.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleEdit(scope, e)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(scope.id, e)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {scopes.length === 0 && !isLoading && (
          <div className="col-span-full p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500">
            No scopes found. Branches will use isolated inventory.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">
                {selectedScope ? 'Edit Scope' : 'Add New Scope'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scope Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  placeholder="e.g. Central Warehouse"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  placeholder="e.g. Shares inventory across all CBD branches"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium"
                >
                  Save Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
