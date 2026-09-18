import { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2 } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import LocationModal from './LocationModal';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export default function LocationManager() {
  const { locations, activeLocationId, setActiveLocationId, isLoading } = useBranchContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const { confirm } = useConfirm();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (locations.length <= 1) {
      toast.error('You must have at least one location.');
      return;
    }
    
    const confirmed = await confirm({
      title: 'Delete Branch?',
      message: 'Are you sure you want to delete this branch? This will delete all connected outlets and data.',
      confirmText: 'Delete Branch'
    });
    if (!confirmed) return;
    
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

  const handleEdit = (loc: any, e: React.MouseEvent) => {
    e.stopPropagation();
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
          className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold py-2.5 px-6 rounded-full flex items-center gap-2 shadow-[0_8px_20px_rgba(14,165,233,0.3)] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <div 
            key={loc.id} 
            onClick={() => setActiveLocationId(loc.id)}
            className={`bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border cursor-pointer hover:-translate-y-1 transition-all duration-300 ${activeLocationId === loc.id ? 'border-sky-400 bg-sky-50 shadow-[0_12px_40px_rgba(14,165,233,0.15)] ring-1 ring-sky-400' : 'border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(14,165,233,0.1)] hover:border-sky-200'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${activeLocationId === loc.id ? 'bg-sky-500 text-white shadow-sky-200' : 'bg-white text-slate-500 border border-slate-100'}`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{loc.name}</h4>
                  <p className="text-xs text-slate-500">{loc.address || 'No address set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleEdit(loc, e)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(loc.id, e)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Show a "Manage Servers & Outlets" hint button */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <span className="text-xs font-semibold text-sky-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Manage Servers & Outlets &rarr;
                </span>
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
