import { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Edit2 } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import { getApiBaseUrl } from '../../lib/utils';
import OutletModal from './OutletModal';
import toast from 'react-hot-toast';

export default function OutletsManager() {
  const { activeLocationId } = useBranchContext();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);

  const fetchOutlets = async () => {
    if (!activeLocationId) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/outlets/location/${activeLocationId}`, {
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) setOutlets(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, [activeLocationId]);



  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return;
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = getApiBaseUrl();
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" /> Manage Registers / Outlets
          </h3>
          <button onClick={handleNew} className="btn btn-primary btn-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Outlet
          </button>
        </div>
        
        {loading ? <p>Loading...</p> : (
          <div className="divide-y divide-gray-100">
            {outlets.map(o => (
              <div key={o.id} className="py-4 flex justify-between items-center hover:bg-gray-50 -mx-6 px-6">
                <div>
                  <h4 className="font-bold text-gray-900">{o.name}</h4>
                  <p className="text-sm text-gray-500">ID: {o.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(o)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(o.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {outlets.length === 0 && <p className="text-gray-500 text-center py-4">No outlets configured yet.</p>}
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
