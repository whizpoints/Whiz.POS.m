import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Monitor, CheckCircle, XCircle, Loader2, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConnectServer() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [serverName, setServerName] = useState('My Local Server');
  
  // Branch Selection
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // User's business details
  const userRaw = localStorage.getItem('whiz-user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const token = localStorage.getItem('whiz-token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Pairing Request
        const res = await fetch(`${API_BASE_URL}/api/pairing/${requestId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load request');

        // Fetch Branches to assign the server
        if (user?.businessId) {
          const locRes = await fetch(`${API_BASE_URL}/api/business/locations`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (locRes.ok) {
            const locData = await locRes.json();
            const fetchedLocations = locData.locations || [];
            setLocations(fetchedLocations);
            
            // Auto-select logic
            if (user.locationId) {
              // Manager is locked to a branch
              setSelectedLocationId(user.locationId);
            } else if (fetchedLocations.length > 0) {
              // Super Admin defaults to first branch
              setSelectedLocationId(fetchedLocations[0].id);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load connection request');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [requestId, API_BASE_URL, token, user?.businessId, user?.locationId]);

  const handleApprove = async () => {
    if (!user?.businessId) {
      toast.error('You must be logged in to a business account');
      return;
    }
    if (!selectedLocationId) {
      toast.error('Please select a branch for this server');
      return;
    }

    setApproving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pairing/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: user.businessId,
          serverName,
          locationId: selectedLocationId // Pass the selected branch!
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      
      toast.success('Server linked successfully!');
      setTimeout(() => navigate('/dashboard/outlets'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary w-full">Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        
        <div className="flex justify-center mb-6 relative">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Monitor className="w-8 h-8 text-blue-600" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1 border-2 border-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Link New Device</h2>
        <p className="text-center text-slate-500 mb-6 text-sm">
          A Local Server is requesting to securely connect to your cloud account.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Device Name</label>
            <input 
              type="text" 
              value={serverName}
              onChange={e => setServerName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Nairobi Main Register"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Store className="w-3 h-3" />
              Assign to Branch
            </label>
            {user?.locationId ? (
              // Locked Manager View
              <div className="w-full bg-slate-200/50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 cursor-not-allowed">
                {locations.find(l => l.id === user.locationId)?.name || 'Your Assigned Branch'}
              </div>
            ) : (
              // Super Admin View
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>Select a branch...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleApprove}
            disabled={approving || !selectedLocationId}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {approving ? 'Linking...' : 'Approve Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
