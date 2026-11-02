import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getCachedData, setCachedData } from '../lib/cache';

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

let cachedBizId: string | null = null;
let cachedLocations: StoreLocation[] | null = null;
let cachedScopes: InventoryScope[] | null = null;
let cachedActiveLocationId: string | 'ALL' = 'ALL';

export const clearBranchCache = () => {
  cachedBizId = null;
  cachedLocations = null;
  cachedScopes = null;
  cachedActiveLocationId = 'ALL';
};

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  let currentBizId: string | null = null;
  let userLocationId: string | null = null;
  try {
    const uStr = localStorage.getItem('whiz-user');
    if (uStr && uStr !== 'undefined') {
      const user = JSON.parse(uStr);
      currentBizId = user.businessId || user.id || null;
      if (user.locationId) {
        userLocationId = user.locationId;
      }
    }
  } catch(e) {}

  // Hydrate from instant cache if available
  if (!cachedLocations) {
    cachedLocations = getCachedData('business_locations', []);
    if (cachedLocations.length === 0) cachedLocations = null;
  }
  if (!cachedScopes) {
    cachedScopes = getCachedData('business_scopes', []);
    if (cachedScopes.length === 0) cachedScopes = null;
  }

  // Invalidate cache if business changed
  if (cachedBizId !== currentBizId) {
    cachedBizId = currentBizId;
    cachedLocations = getCachedData('business_locations', []);
    if (cachedLocations.length === 0) cachedLocations = null;
    cachedScopes = null;
    cachedActiveLocationId = userLocationId || (cachedLocations && cachedLocations.length > 0 ? cachedLocations[0].id : 'ALL');
  }

  const [locations, setLocations] = useState<StoreLocation[]>(cachedLocations || []);
  const [scopes, setScopes] = useState<InventoryScope[]>(cachedScopes || []);
  const [activeLocationId, setActiveLocationIdState] = useState<string | 'ALL'>(cachedActiveLocationId);
  const [isLoading, setIsLoading] = useState(false);

  const setActiveLocationId = (id: string | 'ALL') => {
    // Prevent switching if the user is locked to a branch
    if (userLocationId) return;
    cachedActiveLocationId = id;
    setActiveLocationIdState(id);
  };

  useEffect(() => {
    if (userLocationId) {
      cachedActiveLocationId = userLocationId;
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
            cachedBizId = currentBizId;
            cachedLocations = data.locations;
            setCachedData('business_locations', data.locations);
            setLocations(data.locations);

            // Verify activeLocationId belongs to this user's locations
            const hasValidActive = data.locations.some((l: any) => l.id === activeLocationId);
            if (!userLocationId && data.locations.length > 0 && (!hasValidActive || activeLocationId === 'ALL')) {
              cachedActiveLocationId = data.locations[0].id;
              setActiveLocationIdState(data.locations[0].id);
            }
          }
        }
        
        if (scopeRes.ok) {
          const data = await scopeRes.json();
          if (data.success) {
            cachedScopes = data.scopes || [];
            setCachedData('business_scopes', data.scopes || []);
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
  }, [currentBizId]);

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
