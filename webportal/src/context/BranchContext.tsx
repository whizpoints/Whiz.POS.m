import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface InventoryScope {
  id: string;
  name: string;
  description?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  address?: string;
  createdAt?: string;
  apiKey?: string;
  pairingCode?: string;
  scopeId?: string;
}

interface BranchContextType {
  locations: StoreLocation[];
  scopes: InventoryScope[];
  activeLocationId: string | 'ALL';
  setActiveLocationId: (id: string | 'ALL') => void;
  isLoading: boolean;
  isLocked: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [scopes, setScopes] = useState<InventoryScope[]>([]);
  const [activeLocationId, setActiveLocationIdState] = useState<string | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  let userLocationId: string | null = null;
  try {
    const uStr = localStorage.getItem('whiz-user');
    if (uStr && uStr !== 'undefined') {
      const user = JSON.parse(uStr);
      if (user.locationId) {
        userLocationId = user.locationId;
      }
    }
  } catch(e) {}

  const setActiveLocationId = (id: string | 'ALL') => {
    // Prevent switching if the user is locked to a branch
    if (userLocationId) return;
    setActiveLocationIdState(id);
  };

  useEffect(() => {
    if (userLocationId) {
      setActiveLocationIdState(userLocationId);
    }
  }, [userLocationId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('whiz-token');
        if (!token) {
           setIsLoading(false);
           return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        const [locRes, scopeRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/business/locations`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/business/scopes`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (locRes.ok) {
          const data = await locRes.json();
          if (data.success && data.locations) {
            setLocations(data.locations);
            // Default to the first location for a single-server architecture
            if (!userLocationId && data.locations.length > 0 && activeLocationId === 'ALL') {
              setActiveLocationIdState(data.locations[0].id);
            }
          }
        }
        
        if (scopeRes.ok) {
          const data = await scopeRes.json();
          if (data.success) {
            setScopes(data.scopes || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch locations/scopes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <BranchContext.Provider value={{ locations, scopes, activeLocationId, setActiveLocationId, isLoading, isLocked: !!userLocationId } as any}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};

