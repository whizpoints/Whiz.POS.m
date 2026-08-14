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

const userStr = localStorage.getItem('whiz-user') || '{}';
let user = null;
try { user = JSON.parse(userStr); } catch (e) {}

const businessStr = localStorage.getItem('whiz-business') || '{}';
let business = null;
try { business = JSON.parse(businessStr); } catch (e) {}

export const usePosStore = create((set, get) => ({
  businessSetup: business,
  transactions: [],
  currentCashier: user,
  documentSettings: {
    taxRate: 16,
    defaultNotes: 'Thank you for your business!',
    currency: 'KES',
    logo: null,
  },
  saveDocumentSettings: (settings: any) => set({ documentSettings: settings }),
  creditCustomers: [],
  saveCreditCustomer: () => {},
  documents: [],
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
  }
}));
