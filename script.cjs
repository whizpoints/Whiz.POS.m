const fs = require('fs');

const path = 'local-server/src/pages/LocalSetupPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace handleVerifyApiKey
const handleVerifyRegex = /const handleVerifyApiKey = async \(\) => \{[\s\S]*?^\s*\};\n/m;
const newHandleLink = `
  // --- NEW: Modern Browser Authorization Flow ---
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  const handleLinkAccount = async () => {
    setLoading(true);
    try {
      const CLOUD_API = (process.env.NODE_ENV === 'production' ? 'https://pos.whizpoint.app' : 'https://api.whizpoint.app');
      
      const res = await fetch(\`\${CLOUD_API}/api/pairing/request\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SERVER', deviceInfo: { os: navigator.platform } })
      });
      if (!res.ok) throw new Error('Failed to generate link request');
      const data = await res.json();
      
      const connectUrl = \`\${CLOUD_API}/connect/server/\${data.requestId}\`;
      
      // Start polling
      const pId = setInterval(() => checkCloudApproval(CLOUD_API, data.requestId, pId), 3000);
      setPollIntervalId(pId);
      
      setIsApiKeyVerified(true); // Hijack the state to show waiting UI
      
      toast(\`Please open the browser window that just popped up, or go to \${connectUrl}\`, { duration: 10000 });
      window.open(connectUrl, '_blank');
    } catch (err: any) {
      toast.error('Cloud connection failed. Ensure you have internet.');
      setLoading(false);
    }
  };

  const checkCloudApproval = async (cloudApi: string, requestId: string, intervalId: any) => {
    try {
      const res = await fetch(\`\${cloudApi}/api/pairing/\${requestId}/status\`);
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.status === 'APPROVED' && data.credentials) {
        clearInterval(intervalId);
        
        // Trigger local DB seeding via /api/setup/sync
        const syncRes = await fetch('/api/setup/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outletId: data.credentials.outletId, cloudToken: data.credentials.apiKey })
        });

        if (syncRes.ok) {
           toast.success('Successfully Linked to Cloud and Synced!');
           setIsBackendReady(false); // force a reload of the layout
           setTimeout(() => window.location.reload(), 1500);
        } else {
           toast.error('Failed to save configuration locally');
           setIsApiKeyVerified(false);
        }
      } else if (data.status === 'EXPIRED') {
        clearInterval(intervalId);
        toast.error('Pairing request expired');
        setIsApiKeyVerified(false);
      }
    } catch (err) {
      // Keep polling
    }
  };
`;

content = content.replace(/const handleVerifyApiKey = async \(\) => \{[\s\S]*?\};(?:\r?\n)(?:\r?\n)?/m, newHandleLink);

// The exact string to replace:
const targetUI = `{!isOfflineMode ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Business API Key *</label>
                        <div className="flex gap-2">
                          <input type="text" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setIsApiKeyVerified(false); }} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} placeholder="whiz_..." />
                          <button type="button" onClick={handleVerifyApiKey} disabled={loading || !apiKey} className="px-4 py-3 rounded-xl bg-blue-500 text-white font-semibold disabled:opacity-50">Verify</button>
                        </div>
                      </div>
                      
                      {isApiKeyVerified && (
                        <div className="space-y-1.5 animate-in fade-in mt-4">
                          <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--text-muted)' }}>Select Branch (Location) *</label>
                          {availableLocations.length > 0 ? (
                            <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-300" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}>
                              {availableLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">No branches found. Please create a branch in the Back Office first.</div>
                          )}
                        </div>
                      )}

                      {isApiKeyVerified && (
                        <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-tertiary)' }}>
                          <div className="text-xs uppercase font-semibold text-gray-500 mb-2">Business Details (Auto-filled)</div>
                          <div className="font-medium">{businessName}</div>
                          {availableLocations.find(l => l.id === selectedLocationId)?.address && (
                            <div className="text-sm text-gray-500 mt-1">{availableLocations.find(l => l.id === selectedLocationId)?.address}</div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (`;

const newUI = `{!isOfflineMode ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6 mt-4">
                      {isApiKeyVerified ? (
                        <div className="text-center animate-in fade-in">
                           <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                           <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Waiting for Approval</h3>
                           <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Please log in to your Whiz POS Cloud Admin to approve this server link.</p>
                           <button type="button" onClick={() => { if(pollIntervalId) clearInterval(pollIntervalId); setIsApiKeyVerified(false); }} className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">Cancel</button>
                        </div>
                      ) : (
                        <div className="text-center w-full">
                          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Link Server to Cloud</h3>
                          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Securely pair this local server with your Whiz POS account to sync your business operations.</p>
                          <button type="button" onClick={handleLinkAccount} disabled={loading} className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                            {loading ? 'Generating Link...' : 'Link WHIZPOS Account'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (`;

content = content.replace(targetUI, newUI);

fs.writeFileSync(path, content, 'utf8');
console.log("SUCCESS");
