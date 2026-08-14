import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface StoreLocation {
  id: string;
  name: string;
  address?: string;
  createdAt?: string;
}

interface BranchContextType {
  locations: StoreLocation[];
  activeLocationId: string | 'ALL';
  setActiveLocationId: (id: string | 'ALL') => void;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('whiz-token');
        if (!token) {
           setIsLoading(false);
           return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.whizpoint.app';
        const res = await fetch(`${API_BASE_URL}/api/business/locations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLocations(data.locations || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return (
    <BranchContext.Provider value={{ locations, activeLocationId, setActiveLocationId, isLoading }}>
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
