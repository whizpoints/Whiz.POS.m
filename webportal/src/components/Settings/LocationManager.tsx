import { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2 } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import LocationModal from './LocationModal';
import toast from 'react-hot-toast';

export default function LocationManager() {
  const { locations, activeLocationId, isLoading } = useBranchContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (locations.length <= 1) {
      toast.error('You must have at least one location.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this branch? This will delete all connected outlets and data.')) return;
    
    try {
      const token = localStorage.getItem('whiz-token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${API_BASE_URL}/api/business/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      if (res.ok) {
        toast.success('Location deleted');
        window.location.reload(); // Quick way to refresh context
      } else {
        toast.error('Failed to delete location');
      }
    } catch (err) {
      toast.error('Error deleting location');
    }
  };

  const handleEdit = (loc: any) => {
    setSelectedLocation(loc);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedLocation(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Branches & Locations</h3>
          <p className="text-sm text-slate-500">Manage your physical store locations.</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <div key={loc.id} className={`glass-panel p-5 rounded-2xl border ${activeLocationId === loc.id ? 'border-sky-500 bg-sky-500/5' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{loc.name}</h4>
                  <p className="text-xs text-slate-500">{loc.address || 'No address set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(loc)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {locations.length === 0 && !isLoading && (
          <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500">
            No locations found.
          </div>
        )}
      </div>

      {isModalOpen && (
        <LocationModal
          location={selectedLocation}
          onClose={() => {
            setIsModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
