import { useState, useEffect } from 'react';
import { Server, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Terminal {
  id: string;
  name: string;
  macAddress: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  apiKey?: string;
  createdAt: string;
}

interface Outlet {
  id: string;
  name: string;
  businessId: string;
  locationId: string;
  createdAt: string;
}

export default function Outlets() {
  const [activeTab, setActiveTab] = useState<'terminals' | 'outlets'>('terminals');
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (activeTab === 'terminals') {
        fetchTerminals(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchTerminals(true),
      fetchOutlets(true)
    ]);
    setIsLoading(false);
  };

  const fetchTerminals = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/terminals', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch terminals');
      setTerminals(await res.json());
    } catch (e: any) {
      if (showLoading) toast.error(e.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const fetchOutlets = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/outlets', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` }
      });
      if (res.ok) {
        setOutlets(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/terminals/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` }
      });
      if (!res.ok) throw new Error('Failed to approve');
      toast.success('Terminal Approved and Outlet Created!');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this terminal?')) return;
    try {
      const res = await fetch(`/api/terminals/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('whiz-token')}` }
      });
      if (!res.ok) throw new Error('Failed to reject');
      toast.success('Terminal Rejected');
      fetchTerminals();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Terminals & Outlets</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage connected POS devices and physical outlets.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setActiveTab('terminals')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'terminals' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Device Approvals
          {terminals.filter(t => t.status === 'PENDING').length > 0 && (
            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
              {terminals.filter(t => t.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('outlets')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'outlets' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Active Outlets
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : activeTab === 'terminals' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Device Name</th>
                  <th className="px-6 py-4">MAC Address</th>
                  <th className="px-6 py-4">Requested At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No terminal requests found.
                    </td>
                  </tr>
                ) : (
                  terminals.map(terminal => (
                    <tr key={terminal.id} className="border-b last:border-0 hover:bg-gray-50/50" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-6 py-4 font-medium flex items-center gap-3 max-w-[200px]" style={{ color: 'var(--text-main)' }}>
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Server size={16} />
                        </div>
                        <span className="truncate" title={terminal.name}>{terminal.name}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs max-w-[150px] truncate" title={terminal.macAddress} style={{ color: 'var(--text-muted)' }}>{terminal.macAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(terminal.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {terminal.status === 'PENDING' && (
                          <span className="flex items-center gap-1.5 text-yellow-600 bg-yellow-100 px-2.5 py-1 rounded-full w-fit text-xs font-medium">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                        {terminal.status === 'APPROVED' && (
                          <span className="flex items-center gap-1.5 text-green-600 bg-green-100 px-2.5 py-1 rounded-full w-fit text-xs font-medium">
                            <CheckCircle size={14} /> Approved
                          </span>
                        )}
                        {terminal.status === 'REJECTED' && (
                          <span className="flex items-center gap-1.5 text-red-600 bg-red-100 px-2.5 py-1 rounded-full w-fit text-xs font-medium">
                            <XCircle size={14} /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {terminal.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(terminal.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(terminal.id)}
                              className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {outlets.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-500">
                No outlets found. Approve a terminal to create an outlet.
              </div>
            ) : (
              outlets.map(outlet => (
                <Link to={`/dashboard/outlets/${outlet.id}`} key={outlet.id} className="p-5 rounded-xl border flex flex-col gap-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group block" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Server size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-blue-600 transition-colors" title={outlet.name} style={{ color: 'var(--text-main)' }}>{outlet.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Created {new Date(outlet.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">Online</span>
                    <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
