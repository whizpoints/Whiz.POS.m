import { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Edit2, Package, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBranchContext } from '../../context/BranchContext';
import OutletModal from './OutletModal';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export default function OutletsManager() {
  const { activeLocationId } = useBranchContext();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);

  const { confirm } = useConfirm();

  const fetchOutlets = async () => {
    if (!activeLocationId) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/outlets/${activeLocationId}`, {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOutlets(Array.isArray(data) ? data : (data?.outlets || (data?.id ? [data] : [])));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
    const handleOutletChanged = () => fetchOutlets();
    window.addEventListener('whiz_outlet_changed', handleOutletChanged);
    return () => window.removeEventListener('whiz_outlet_changed', handleOutletChanged);
  }, [activeLocationId]);



  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Outlet?',
      message: 'Are you sure you want to delete this outlet?',
      confirmText: 'Delete Outlet'
    });
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/outlets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        toast.success('Outlet deleted');
        fetchOutlets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (outlet: any) => {
    setSelectedOutlet(outlet);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedOutlet(null);
    setIsModalOpen(true);
  };

  if (!activeLocationId) return <p>Please select a Location first.</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/90 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-6 text-slate-900 dark:text-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" /> Manage Registers / Outlets
          </h3>
          <button onClick={handleNew} className="btn btn-primary btn-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Outlet
          </button>
        </div>
        
        {loading ? <p>Loading...</p> : (
          <div className="divide-y divide-gray-100">
            {outlets.map(o => (
              <div key={o.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {o.name}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono">ID: {o.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/dashboard/outlets/${o.id}`}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors border border-blue-200"
                  >
                    <Package className="w-3.5 h-3.5" /> Manage Inventory & Staff
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => handleEdit(o)} title="Edit Outlet Name" className="text-gray-500 dark:text-slate-400 hover:bg-gray-100 p-2 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(o.id)} title="Delete Outlet" className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {outlets.length === 0 && <p className="text-gray-500 dark:text-slate-400 text-center py-4">No outlets configured yet.</p>}
          </div>
        )}
      </div>

      <OutletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        outlet={selectedOutlet}
        onComplete={fetchOutlets}
      />
    </div>
  );
}
