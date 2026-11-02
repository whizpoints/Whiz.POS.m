import { create } from 'zustand';

export interface SavedDocument {
  id: string;
  type: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  metadata: any;
}

// CRITICAL FIX: Proactively purge legacy persistent storage key to prevent cross-tenant/user data leaks
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    window.localStorage.removeItem('pos-store');
  } catch (e) {}
}

const getInitialUser = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const userStr = localStorage.getItem('whiz-user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

const getInitialBusiness = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const businessStr = localStorage.getItem('whiz-business');
    return businessStr ? JSON.parse(businessStr) : null;
  } catch (e) {
    return null;
  }
};

export interface PosState {
  businessSetup: any;
  transactions: any[];
  currentCashier: any;
  documentSettings: any;
  saveDocumentSettings: (settings: any) => void;
  creditCustomers: any[];
  saveCreditCustomer: () => void;
  documents: any[];
  saveDocument: (doc: any) => void;
  deleteDocument: (id: string) => void;
  resetPosStore: () => void;
}

const initialState = {
  transactions: [],
  documentSettings: null,
  creditCustomers: [],
  documents: []
};

// Pure in-memory session store (NO persist middleware) - strictly isolated per session and business
export const usePosStore = create<PosState>((set, get: any) => ({
  businessSetup: getInitialBusiness(),
  currentCashier: getInitialUser(),
  ...initialState,
  saveDocumentSettings: (settings: any) => set({ documentSettings: settings }),
  saveCreditCustomer: () => {},
  saveDocument: (doc: any) => {
    const state: any = get();
    const exists = state.documents.some((d: any) => d.id === doc.id);
    if (exists) {
      set({ documents: state.documents.map((d: any) => d.id === doc.id ? doc : d) });
    } else {
      set({ documents: [...state.documents, doc] });
    }
  },
  deleteDocument: (id: string) => {
    const state: any = get();
    set({ documents: state.documents.filter((d: any) => d.id !== id) });
  },
  resetPosStore: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('pos-store');
      } catch (e) {}
    }
    set({
      businessSetup: null,
      currentCashier: null,
      transactions: [],
      documentSettings: null,
      creditCustomers: [],
      documents: []
    });
  }
}));

export const resetPosStore = () => usePosStore.getState().resetPosStore();
