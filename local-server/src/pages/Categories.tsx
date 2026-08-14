import { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` }
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (e) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('whiz-token')}`
        },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to save category');
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      closeModal();
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete category');
      toast.success('Category deleted');
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
    } else {
      setEditingCategory(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setName('');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Categories</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage product categories for your business.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} /> New Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Category Name</th>
                <th className="px-6 py-4 rounded-tr-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-500">No categories found.</td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-gray-50/50" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-6 py-4 font-medium flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Layers size={16} />
                      </div>
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openModal(cat)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl font-medium border hover:bg-gray-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
