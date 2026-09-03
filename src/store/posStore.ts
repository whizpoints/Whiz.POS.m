import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NetworkClient } from '../lib/networkClient';

// Define the Electron API that will be exposed on the window object
declare global {
  interface Window {
    /**
     * The Electron interface exposed via `preload.js`.
     * Provides secure access to native functionality.
     */
    electron: {
      /**
       * Saves data to a local JSON file.
       */
      saveData: (fileName: string, data: any) => Promise<{ success: boolean; error?: any }>;

      /**
       * Reads data from a local JSON file.
       */
      readData: (fileName: string) => Promise<{ success: boolean; data?: any; error?: any }>;

      /**
       * Prints a transaction receipt.
       */
      printReceipt: (transaction: Transaction, businessSetup: BusinessSetup, isReprint: boolean) => void;

      /**
       * Saves a temporary image to the persistent local storage.
       */
      saveImage: (tempPath: string) => Promise<{ success: boolean; path?: string; fileName?: string; error?: any }>;

      /**
       * Prints the daily closing report.
       */
      printClosingReport: (reportData: ClosingReportData, businessSetup: BusinessSetup, detailed?: boolean) => void;

      /**
       * Prints the initial business setup sheet.
       */
      printBusinessSetup: (businessSetup: BusinessSetup, adminUser: User) => void;

      /**
       * Retrieves the local API configuration (URL, Key, QR).
       */
      getApiConfig: () => Promise<{ apiUrl: string, apiKey: string, qrCodeDataUrl: string }>;

      /**
       * Uploads an image to the remote Back Office server.
       */
      uploadImage: (filePath: string, apiUrl: string, apiKey: string) => Promise<{ imageUrl: string }>;

      /**
       * Gets list of printers.
       */
      getPrinters: () => Promise<any[]>;

      /**
       * Listen for sync updates from mobile.
       */
      onMobileDataSync: (callback: (event: any, payload: any) => void) => void;

      /**
       * Listen for new mobile receipt requests.
       */
      onNewMobileReceipt: (callback: (event: any, receipt: any) => void) => void;

      // Developer Tools
      getDeveloperConfig: () => Promise<{ developerPin: string | null; mongoUri: string; backOfficeUrl: string; backOfficeApiKey: string }>;
      saveDeveloperConfig: (config: { developerPin?: string; mongoUri?: string }) => Promise<{ success: boolean; error?: string }>;
      directDbPush: (mongoUri: string) => Promise<{ success: boolean; error?: string }>;
      directDbPull: (mongoUri: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      savePrinterSettings: (settings: { defaultPrinter: string }) => Promise<{ success: boolean }>;
      getPrinterSettings: () => Promise<{ defaultPrinter: string }>;
      getPrinters: () => Promise<any[]>;
      checkForUpdate: () => void;
      toggleFullscreen: () => void;
      getConnectedDevices: () => Promise<{ ip: string; name: string; lastSeen: string }[]>;
      backupData: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      restoreData: () => Promise<{ success: boolean; error?: string }>;

      auth: {
        login: (userId: string, pin: string, deviceId?: string) => Promise<{ success: boolean; token?: string; user?: any; error?: string }>;
        logout: (token: string) => Promise<{ success: boolean }>;
        verify: (token: string) => Promise<{ success: boolean; user?: any }>;
      };

      completeAtomicSale: (saleData: any, paymentData?: any) => Promise<{success: boolean, transactionId?: string, error?: string}>;

      userManagement: {
        addUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
        updateUser: (userId: string, updates: any) => Promise<{ success: boolean; error?: string }>;
        deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

// Add SessionToken to interface
interface PosState {
    // ... existing ...
    sessionToken: string | null;
    setSession: (user: User, token: string) => void;
}

// Helper function for saving data via Electron's main process
const saveDataToFile = async (fileName: string, data: any) => {
  if (window.electron) {
    try {
      const result = await window.electron.saveData(fileName, data);
      if (!result.success) {
        console.error(`Failed to save ${fileName}:`, result.error);
      } else {
        // console.debug(`Successfully saved ${fileName}`);
      }
      return result;
    } catch (e) {
      console.error(`Exception while saving ${fileName}:`, e);
      return { success: false, error: e };
    }
  } else {
    console.warn('Electron API not available. Data not saved to disk.');
    return { success: true }; // Prevent crashes in a pure web environment
  }
};

// Helper function for reading data via Electron's main process
const readDataFromFile = async (fileName: string) => {
  if (window.electron) {
    return await window.electron.readData(fileName);
  } else {
    console.error('Electron API is not available. This application is designed to run in Electron.');
    return { success: false, error: 'Electron API not available' };
  }
};

const generateRandomId = () => {
    return Math.floor(10000000 + Math.random() * 90000000);
};

// Generate a stable numeric ID from a string (e.g. product name)
const generateStableId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  localImage?: string;
  available: boolean;
  stock?: number;
  minStock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  timestamp: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'credit';
  cashier: string;
  creditCustomer?: string;
  status: 'completed' | 'pending' | 'refunded';
}

export interface CreditSale {
  transactionId: string;
  amount: number;
  paidAmount: number;
  status: 'unpaid' | 'partially-paid' | 'paid';
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  taxId?: string;
  totalCredit: number;
  paidAmount: number;
  balance: number;
  transactions: string[]; // Store transaction IDs
  createdAt: string;
  lastUpdated: string;
}

// New Interface for Payment History
export interface CreditPayment {
    id: string;
    customerId: string;
    amount: number;
    date: string;
    cashierId?: string;
    transactionId?: string; // Linked to specific transaction
}

export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  taxId?: string;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalSpent: number;
  visitsCount: number;
  lastVisit: string;
  rewards: string[];
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  location: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  timestamp: string;
  cashier: string;
  receipt?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  dateCreated: string;
  dateExpected?: string;
  items: { productId: number; productName: string; quantity: number; costPrice: number }[];
  totalAmount: number;
  notes?: string;
}

export interface Salary {
  id: string;
  employeeName: string;
  amount: number;
  date: string;
  type: 'advance' | 'full';
  notes?: string;
}

export interface BusinessSetup {
  businessName: string;
  businessId?: string;
  apiUrl?: string;
  apiKey?: string;
  backOfficeUrl?: string;
  backOfficeApiKey?: string;
  mongoDbUri?: string;
  address: string;
  phone?: string;
  email?: string;
  taxRate?: number;
  currency?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  printerType: 'thermal' | 'standard';
  selectedPrinter?: string;
  showPrintPreview?: boolean;
  onScreenKeyboard?: boolean;
  printerPaperWidth?: number; // Paper width in mm
  isSetup: boolean;
  isLoggedIn: boolean; // Added for login state
  createdAt: string;
  servedByLabel: string;
  mpesaPaybill: string;
  mpesaTill: string;
  mpesaAccountNumber: string;
  tax: number;
  subtotal: number;
  locationName?: string;
  autoLogoffEnabled?: boolean;
  autoLogoffMinutes?: number;
  mpesaConfig?: {
    enabled: boolean;
    backendUrl: string;
    apiKey: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    shortcode: string;
    partyB: string;
    callbackUrl: string;
    type: 'Paybill' | 'Till';
    environment: 'Sandbox' | 'Production';
  };
}

export interface CreditTransaction {
  customerName: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'partially-paid';
}

export interface CashierReport {
  cashierName: string;
  transactions: Transaction[];
  totalSales: number;
  cashTotal: number;
  mpesaTotal: number;
  creditTotal: number;
  creditTransactions: CreditTransaction[];
}

export interface ItemSales {
    name: string;
    quantity: number;
    total: number;
}

export interface ClosingReportData {
  date: string;
  cashiers: CashierReport[];
  itemSales: ItemSales[];
  grandTotal: number;
  totalCash: number;
  totalMpesa: number;
  totalCredit: number;
}

export interface InventoryLog {
    id: string;
    productId: number | string;
    productName: string;
    oldStock: number;
    newStock: number;
    variance: number;
    cashierName: string;
    timestamp: string;
    reason?: string;
    reference?: string;
    type?: string;
}

export interface DailySummary {
  date: string;
  totalSales: number;
  cashTotal: number;
  mpesaTotal: number;
  creditTotal: number;
  expenseTotal: number;
  transactionCount: number;
}

export interface SavedDocument {
  id: string;
  type: string;
  name: string;
  date: string;
  data: any; // The full state of the document editor
}

export interface DocumentSettings {
  logoImage: string | null;
  headerImage: string | null;
  backgroundImage: string | null;
  useCustomHeader: boolean;
  defaultNotes: string;
  defaultPaymentInfo: string;
  showWatermark: boolean;
}

interface PosState {
  // Data
  products: Product[];
  cart: CartItem[];
  transactions: Transaction[];
  dailySummaries: Record<string, DailySummary>; // Archived data
  creditCustomers: CreditCustomer[];
  creditPayments: CreditPayment[];
  inventoryLogs: InventoryLog[];
  users: User[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  salaries: Salary[];
  documents: SavedDocument[];
  documentSettings: DocumentSettings | null;
  businessSetup: BusinessSetup | null;
  mobileReceipts: any[];
  loyaltyCustomers: LoyaltyCustomer[];
  
  // UI State
  isDataLoaded: boolean;
  isSyncingPush: boolean;
  currentCashier: User | null;
  isCheckoutOpen: boolean;
  isSetupWizardOpen: boolean;
  isLoginOpen: boolean;
  isKeyboardOpen: boolean;
  activeInput: HTMLInputElement | HTMLTextAreaElement | null;
  keyboardInput: string;
  currentPage: 'pos' | 'reports' | 'customers' | 'settings' | 'closing' | 'dashboard' | 'inventory' | 'loyalty' | 'scanner' | 'sync' | 'register' | 'backoffice' | 'mobile-receipts';
  // Settings
  isOnline: boolean;
  syncQueue: any[];
  lastSyncTime: string | null;
  isSidebarCollapsed: boolean;
  // Transaction Success Popup
  isTransactionSuccessPopupOpen: boolean;
  lastCompletedTransaction: Transaction | null;
  
  // Enhanced features state
  inventoryProducts: Product[];
  loyaltyCustomers: any[];
  syncHistory: any[];
  categories: string[];

  // Payment State Machine
  paymentState: 'IDLE' | 'WAITING_FOR_PAYMENT' | 'PAYMENT_DETECTED' | 'PAYMENT_CONFIRMED' | 'SALE_COMPLETED' | 'PAYMENT_FAILED';
  idempotencyKey: string | null;
  setPaymentState: (state: PosState['paymentState']) => void;
  setIdempotencyKey: (key: string | null) => void;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  setProducts: (products: Product[]) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  
  setCurrentCashier: (user: User | null) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openSetupWizard: () => void;
  closeSetupWizard: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  openKeyboard: (inputElement: HTMLInputElement | HTMLTextAreaElement) => void;
  closeKeyboard: () => void;
  updateKeyboardTargetValue: (value: string) => void;
  setKeyboardInput: (value: string) => void;
  setCurrentPage: (page: PosState['currentPage']) => void;

  completeTransaction: (paymentMethod: 'cash' | 'mpesa' | 'credit', creditCustomer?: string, additionalData?: { amountTendered?: number; change?: number; mpesaCode?: string; phoneNumber?: string }) => Promise<void>;
  reprintTransaction: (transactionId: string) => void;
  reverseTransaction: (transactionId: string) => void;
  saveTransaction: (transaction: Transaction) => void;
  saveCreditCustomer: (customer: CreditCustomer) => void;
  updateCreditCustomer: (id: string, updates: Partial<CreditCustomer>) => void;
  deleteCreditCustomer: (id: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addLoyaltyCustomer: (customer: LoyaltyCustomer) => void;
  updateLoyaltyCustomer: (id: string, updates: Partial<LoyaltyCustomer>) => void;
  deleteTransactions: (ids: string[]) => void;
  addSalary: (salary: Salary) => void;
  deleteSalary: (id: string) => void;
  saveBusinessSetup: (setup: BusinessSetup) => void;
  saveDocumentSettings: (settings: DocumentSettings) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  
  // Procurement & Suppliers
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  receivePurchaseOrder: (poId: string) => void;

  migrateLegacyExpenses: () => Promise<void>;
  saveDocument: (doc: SavedDocument) => void;
  deleteDocument: (id: string) => void;

  // Sync operations
  addToSyncQueue: (operation: any) => void;
  processSyncQueue: () => void;
  syncFromServer: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  handleMobileDataSync: (payload: any) => void;

  // Mobile Receipts
  loadMobileReceipts: () => Promise<void>;
  printMobileReceipt: (receipt: any) => void;
  deleteMobileReceipt: (receipt: any) => void;
  addMobileReceipt: (receipt: any) => void;

  // Reports
  getDailySales: (date: string) => { cash: number; mpesa: number; credit: number; total: number };
  getDailyClosingReport: (date: string) => ClosingReportData;
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getUnpaidCredits: () => CreditCustomer[];

  // Enhanced features actions
  addProduct: (product: Product) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  setCategories: (categories: string[]) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  addLoyaltyCustomer: (customer: any) => void;
  updateLoyaltyCustomer: (id: string, updates: any) => void;
  addSyncHistoryItem: (item: any) => void;
  loadInitialData: () => void;
  finishSetup: (businessData: Omit<BusinessSetup, 'createdAt'>, adminUser: Omit<User, 'createdAt' | 'isActive'>) => Promise<void>;
  pushDataToServer: () => Promise<void>;
  pullDeltaFromServer: () => Promise<void>;
  syncStatus: { isSyncing: boolean, progress: number, currentTask: string, error: string | null };
  setSyncStatus: (status: Partial<{ isSyncing: boolean, progress: number, currentTask: string, error: string | null }>) => void;
  addCreditPayment: (customerId: string, amount: number, transactionId?: string) => void;
  addInventoryLog: (log: InventoryLog) => void;
  archiveTransactions: (daysToKeep: number) => Promise<void>;
}

/**
 * Main Zustand store for the POS application.
 * Handles all state management including products, transactions, users, cart, and sync.
 * Persists data to local storage via 'zustand/middleware'.
 */
export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      // Initial state
      products: [],
      cart: [],
      transactions: [],
      dailySummaries: {},
      creditCustomers: [],
      creditPayments: [],
      inventoryLogs: [],
      loyaltyCustomers: [],
      users: [],
      suppliers: [],
      purchaseOrders: [],
      expenses: [],
      salaries: [],
      documents: [],
      documentSettings: null,
      businessSetup: null,
      currentCashier: null,
      isDataLoaded: false,
      isSyncingPush: false,
      syncStatus: { isSyncing: false, progress: 0, currentTask: '', error: null },
      setSyncStatus: (status) => set((state) => ({ syncStatus: { ...state.syncStatus, ...status } })),
      isCheckoutOpen: false,
      isSetupWizardOpen: true,
      isLoginOpen: true,
      isKeyboardOpen: false,
      activeInput: null,
      keyboardInput: '',
      currentPage: 'pos',
      isOnline: navigator.onLine,
      syncQueue: [],
      lastSyncTime: null,
      mobileReceipts: [],
      sessionToken: null,
      isSidebarCollapsed: false,
      categories: ['Coffee', 'Tea', 'Pastries', 'Sandwiches', 'Cold Drinks', 'Others'],
      isTransactionSuccessPopupOpen: false,
      lastCompletedTransaction: null,
      paymentState: 'IDLE',
      idempotencyKey: null,

      setPaymentState: (state) => set({ paymentState: state }),
      setIdempotencyKey: (key) => set({ idempotencyKey: key }),

      /**
       * Logs in a user and updates the session state.
       */
      login: async (user) => {
        // Wait, user is passed here, but we need PIN for backend auth.
        // Actually, the LoginScreen handles the PIN input and passes the User object IF validation succeeded locally.
        // But we want STRICT BACKEND validation now.
        // So this 'login' action signature needs to change or the caller needs to handle the backend call.
        // The previous implementation was client-side only.

        // Let's assume the caller (LoginScreen) does:
        // 1. await window.electron.auth.login(userId, pin)
        // 2. if success, calls store.login(user, token)

        // Wait, I can't change the signature easily if many components use it, but only LoginScreen uses it.
        // I'll update it to accept the token too.

        // Actually, to keep it clean, let's just update the state here.
        // The LoginScreen will do the heavy lifting of calling the backend.

        // NO, the store action should probably do the backend call?
        // But 'user' argument implies we already have the user object.

        // Let's stick to: Store just updates state. LoginScreen calls Backend.
        // But I need to store the Session Token!
        // I'll add 'sessionToken' to the store state.
      },

      setSession: (user: User, token: string) => {
          set((state) => {
              const updatedSetup = state.businessSetup ? { ...state.businessSetup, isLoggedIn: true } : null;
              if (updatedSetup) {
                 saveDataToFile('business-setup.json', updatedSetup);
              }
              return {
                  currentCashier: user,
                  businessSetup: updatedSetup,
                  sessionToken: token
              };
          });
      },

      /**
       * Logs out the current user.
       */
      logout: async () => {
        const state = get();
        if (state.sessionToken && window.electron && window.electron.auth) {
             await window.electron.auth.logout(state.sessionToken);
        }

        set((state) => ({
          currentCashier: null,
          businessSetup: state.businessSetup ? { ...state.businessSetup, isLoggedIn: false } : null,
          sessionToken: null
        }));
      },

      // Product operations
      setProducts: (products) => set({ products }),

      /**
       * Adds a product to the shopping cart.
       * Increments quantity if product already exists.
       */
      addToCart: (product) => {
        set((state) => {
          // Prevent adding out-of-stock items
          const availableStock = product.stock ?? 0;
          const existingItem = state.cart.find(item => item.product.id === product.id);
          const currentCartQty = existingItem ? existingItem.quantity : 0;

          if (availableStock <= 0) {
            // Allow adding if stock tracking is disabled (stock === undefined/null)
            if (product.stock !== undefined && product.stock !== null) {
              console.warn(`[CART] Cannot add ${product.name}: out of stock (${availableStock})`);
              return state; // No change
            }
          }

          if (availableStock > 0 && currentCartQty >= availableStock) {
            console.warn(`[CART] Cannot add more ${product.name}: only ${availableStock} in stock, ${currentCartQty} in cart`);
            return state; // No change
          }

          if (existingItem) {
            return {
              cart: state.cart.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            };
          }
          return {
            cart: [...state.cart, { product, quantity: 1 }]
          };
        });
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter(item => item.product.id !== productId)
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set((state) => ({
          cart: state.cart.map(item =>
            item.product.id === productId
              ? { ...item, quantity }
              : item
          )
        }));
      },

      clearCart: () => set({ cart: [] }),

      // User operations
      setCurrentCashier: (user) => set({ currentCashier: user }),

      // UI operations
      openCheckout: () => set({ 
        isCheckoutOpen: true,
        paymentState: 'IDLE',
        idempotencyKey: `TXN${Date.now()}`
      }),
      closeCheckout: () => set({ isCheckoutOpen: false }),
      openSetupWizard: () => set({ isSetupWizardOpen: true }),
      closeSetupWizard: () => set({ isSetupWizardOpen: false }),
      openLogin: () => set({ isLoginOpen: true }),
      closeLogin: () => set({ isLoginOpen: false }),
      openKeyboard: (inputElement) => set({ isKeyboardOpen: true, activeInput: inputElement }),
      closeKeyboard: () => set({ isKeyboardOpen: false, activeInput: null }),

      /**
       * Updates the value of the active input field based on on-screen keyboard input.
       * Dispatches a native 'input' event to ensure React state updates.
       */
      updateKeyboardTargetValue: (value) => {
        const { activeInput, closeKeyboard } = get();
        if (!activeInput) return;

        if (value === 'enter') {
          closeKeyboard();
          return;
        }

        const { selectionStart, selectionEnd, value: currentValue } = activeInput;
        const start = selectionStart || 0;
        const end = selectionEnd || 0;

        let newValue;
        let newCursorPos = start;

        if (value === 'backspace') {
          if (start === end && start > 0) {
            newValue = currentValue.slice(0, start - 1) + currentValue.slice(end);
            newCursorPos = start - 1;
          } else {
            newValue = currentValue.slice(0, start) + currentValue.slice(end);
            newCursorPos = start;
          }
        } else {
          newValue = currentValue.slice(0, start) + value + currentValue.slice(end);
          newCursorPos = start + value.length;
        }

        // Use the native value setter to ensure React detects the change
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;

        if (activeInput instanceof HTMLInputElement && nativeInputValueSetter) {
          nativeInputValueSetter.call(activeInput, newValue);
        } else if (activeInput instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(activeInput, newValue);
        } else {
          activeInput.value = newValue;
        }

        const event = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(event);
        activeInput.selectionStart = activeInput.selectionEnd = newCursorPos;
      },
      setKeyboardInput: (value) => set({ keyboardInput: value }),
      setCurrentPage: (page) => set({ currentPage: page }),

      // Transaction operations
      /**
       * Completes a transaction, saves it, updates credit if needed, and prints receipt.
       */
      openTransactionSuccessPopup: (transaction: Transaction) => {
        set({ isTransactionSuccessPopupOpen: true, lastCompletedTransaction: transaction });
      },
      closeTransactionSuccessPopup: () => {
        set({ isTransactionSuccessPopupOpen: false, lastCompletedTransaction: null });
      },
      completeTransaction: async (paymentMethod, creditCustomerName, additionalData) => {
        const state = get();
        if (!state.currentCashier) return;

        if (state.paymentState === 'PAYMENT_CONFIRMED' || state.paymentState === 'SALE_COMPLETED') {
            return; // Prevent double-charge
        }

        const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const tax = 0; // Assuming tax is handled elsewhere or is 0
        const total = subtotal + tax;

        const transactionId = state.idempotencyKey || `TXN${Date.now()}`;
        
        const transaction: Transaction = {
          id: transactionId,
          timestamp: new Date().toISOString(),
          items: [...state.cart],
          subtotal,
          tax,
          total,
          paymentMethod,
          cashier: state.currentCashier.name,
          creditCustomer: creditCustomerName,
          status: 'completed',
          ...additionalData
        };

        const paymentData = {
           id: `PAY${Date.now()}`,
           saleId: transactionId,
           paymentMethod: paymentMethod,
           amount: total,
           reference: additionalData?.mpesaCode || null,
           status: 'COMPLETED',
           source: 'POS'
        };

        if (window.electron && window.electron.completeAtomicSale) {
            set({ paymentState: 'PAYMENT_CONFIRMED' });
            try {
                const result = await window.electron.completeAtomicSale(transaction, paymentData);
                if (!result.success) {
                    set({ paymentState: 'PAYMENT_FAILED' });
                    console.error('Atomic sale failed on backend:', result.error);
                    return;
                }
            } catch (err) {
                set({ paymentState: 'PAYMENT_FAILED' });
                console.error('Atomic sale threw error:', err);
                return;
            }
        }

        if (paymentMethod === 'mpesa' && additionalData?.mpesaCode) {
            try {
                const rawUrl = (state.businessSetup as any)?.lanAdminIp || (state.businessSetup as any)?.apiUrl || (state.businessSetup as any)?.backOfficeUrl || 'http://localhost:3000';
                const baseUrl = rawUrl.replace(/\/$/, '').replace(/\/api$/, '');
                const bId = (state.businessSetup as any)?.businessId || (state.businessSetup as any)?.cloudBusinessId;
                
                await fetch(`${baseUrl}/api/mpesa/payments/consume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      transactionId: additionalData.mpesaCode,
                      businessId: bId
                    })
                });
            } catch (err) {
                console.error('Failed to consume M-Pesa payment:', err);
            }
        }

        set({ paymentState: 'SALE_COMPLETED', idempotencyKey: null });

        // --- ABSOLUTELY FIRST: SHOW SUCCESS POPUP ---
        if ((state.businessSetup as any)?.disableReceiptPrinting) {
            state.openTransactionSuccessPopup(transaction);
        }

        // --- THEN CLEAR CART AND CLOSE CHECKOUT ---
        state.clearCart();
        state.closeCheckout();

        // --- THEN DO EVERYTHING ELSE ---
        state.saveTransaction(transaction);
        state.addToSyncQueue({ type: 'new-transaction', data: transaction });

        console.log(`[SALE DEBUG] Transaction ${transaction.id} has ${transaction.items.length} items. Products in store: ${state.products.length}`);

        transaction.items.forEach(item => {
           console.log(`[SALE DEBUG] Item: productId=${item.product.id}, name=${item.product.name}, qty=${item.quantity}`);
           if (item.product.id) {
                 const product = state.products.find(p => p.id === item.product.id);
                 console.log(`[SALE DEBUG] Found product in store: ${!!product}, stock=${product?.stock}, typeof stock=${typeof product?.stock}`);
                 if (product) {
                     const oldStock = Number(product.stock) || 0;
                     const newStock = Math.max(0, oldStock - item.quantity);
                   
                   // Append StockMovement log
                   const logEntry = {
                       id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                       productId: product.id,
                       productName: product.name,
                       oldStock,
                       newStock,
                       variance: -item.quantity,
                       cashierName: state.currentCashier?.name || 'Unknown',
                       timestamp: new Date().toISOString(),
                       reason: 'SALE',
                       reference: transaction.id,
                       type: 'SALE'
                   };
                   console.log(`[SALE DEBUG] Calling addInventoryLog with:`, logEntry.id, logEntry.type, logEntry.variance);
                   state.addInventoryLog(logEntry);
               }
           }
        });

        console.log(`[SALE DEBUG] After forEach, syncQueue length: ${get().syncQueue.length}, items: ${get().syncQueue.map((s: any) => s.type).join(', ')}`);

        if (window.electron && window.electron.readData) {
            const productsRes = await window.electron.readData('products.json');
            const freshProducts = (productsRes?.data || []).filter((p: any) => p && p.name && p.price > 0);
            set({ products: freshProducts });
        }

        // Handle credit customer
        if (paymentMethod === 'credit' && creditCustomerName) {
            const existingCustomer = state.creditCustomers.find(c => c.name === creditCustomerName);

            if (existingCustomer) {
                const updatedCustomer: Partial<CreditCustomer> = {
                    totalCredit: (existingCustomer.totalCredit || 0) + total,
                    balance: (existingCustomer.balance || 0) + total,
                    transactions: [...(existingCustomer.transactions || []), transaction.id],
                    lastUpdated: new Date().toISOString(),
                };
                state.updateCreditCustomer(existingCustomer.id, updatedCustomer);
            } else {
                const newCustomer: CreditCustomer = {
                    id: `CUST${Date.now()}`,
                    name: creditCustomerName,
                    phone: '',
                    totalCredit: total,
                    paidAmount: 0,
                    balance: total,
                    transactions: [transaction.id],
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                state.saveCreditCustomer(newCustomer);
            }
        }

        // Handle Loyalty Points
        if (creditCustomerName) {
            const loyaltyCustomer = state.loyaltyCustomers.find(c => c.name === creditCustomerName);
            if (loyaltyCustomer) {
                const newTotalSpent = loyaltyCustomer.totalSpent + total;
                let newTier: LoyaltyCustomer['tier'] = loyaltyCustomer.tier;
                if (newTotalSpent >= 10000) newTier = 'Platinum';
                else if (newTotalSpent >= 5000) newTier = 'Gold';
                else if (newTotalSpent >= 2000) newTier = 'Silver';

                const pointsEarned = Math.floor(total / 10);

                state.updateLoyaltyCustomer(loyaltyCustomer.id, {
                    points: loyaltyCustomer.points + pointsEarned,
                    totalSpent: newTotalSpent,
                    visitsCount: loyaltyCustomer.visitsCount + 1,
                    lastVisit: new Date().toISOString(),
                    tier: newTier
                });
            }
        }

        // Print receipt if enabled
        if (!((state.businessSetup as any)?.disableReceiptPrinting) && window.electron && state.businessSetup) {
            window.electron.printReceipt(transaction, state.businessSetup, false);
        }
      },

      reprintTransaction: (transactionId) => {
        const state = get();
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction && window.electron && state.businessSetup) {
          window.electron.printReceipt(transaction, state.businessSetup, true);
        }
      },

      reverseTransaction: (transactionId) => {
         set((state) => {
             const transaction = state.transactions.find(t => t.id === transactionId);
             if (!transaction) return {};

             // 1. Mark transaction as 'reversed' status, do NOT delete it, so we have a record.
             // Or user said "reverse... incase invalid".
             // If we delete, we lose record. If we reverse, we keep record but marked as reversed.
             // Let's mark as reversed status and filter it out in calculations/reports where necessary?
             // Actually, usually a reversal is a new negative transaction or just updating status.
             // Given the previous requirement of "deleting receipts", user might want it GONE from sales but kept for audit?
             // "ability to reverse a transaction in the old receipts incase an invalid or sale was incomplete or wrong items"
             // Best practice: Update status to 'refunded'/'reversed' and restore stock.

             const updatedTransactions = state.transactions.map(t =>
                 t.id === transactionId ? { ...t, status: 'refunded' } : t
             );

             // 2. Restore Stock
             const updatedProducts = state.products.map(p => {
                 const item = transaction.items.find(i => i.product.id === p.id);
                 if (item && typeof p.stock === 'number') {
                     return { ...p, stock: p.stock + item.quantity };
                 }
                 return p;
             });

             // 3. Handle Credit Reversal if applicable
             let updatedCreditCustomers = state.creditCustomers;
             if (transaction.paymentMethod === 'credit' && transaction.creditCustomer) {
                 updatedCreditCustomers = state.creditCustomers.map(c => {
                     if (c.name === transaction.creditCustomer) {
                         return {
                             ...c,
                             totalCredit: Math.max(0, (c.totalCredit || 0) - transaction.total),
                             balance: Math.max(0, (c.balance || 0) - transaction.total),
                             // We don't remove the transaction ID, but the balance decreases.
                             // The transaction itself is now 'refunded' so it shouldn't count towards debt?
                             // But we just subtracted the total.
                             lastUpdated: new Date().toISOString()
                         };
                     }
                     return c;
                 });
             }

             // Save changes
             saveDataToFile('transactions.json', updatedTransactions);
             saveDataToFile('products.json', updatedProducts);
             saveDataToFile('credit-customers.json', updatedCreditCustomers);

             // Sync
             state.addToSyncQueue({ type: 'update-transaction', data: { id: transactionId, updates: { status: 'refunded' } } });
             transaction.items.forEach(item => {
                if (item.product && item.product.id) {
                     const currentProduct = updatedProducts.find(p => p.id === item.product.id);
                     if (currentProduct) {
                         state.addToSyncQueue({ type: 'update-product', data: { id: item.product.id, updates: { stock: currentProduct.stock } } });
                     }
                }
             });

             return {
                 transactions: updatedTransactions,
                 products: updatedProducts,
                 creditCustomers: updatedCreditCustomers
             };
         });
      },

      saveTransaction: (transaction) => {
        set((state) => {
          const updatedTransactions = [transaction, ...state.transactions];
          saveDataToFile('transactions.json', updatedTransactions);
          return { transactions: updatedTransactions };
        });
      },

      saveCreditCustomer: (customer) => {
        set((state) => {
          const updatedCustomers = [...state.creditCustomers, customer];
          saveDataToFile('credit-customers.json', updatedCustomers);
          state.addToSyncQueue({ type: 'add-credit-customer', data: customer });
          return { creditCustomers: updatedCustomers };
        });
      },

      updateCreditCustomer: (id, updates) => {
        set((state) => {
            const updatedCustomers = state.creditCustomers.map(customer =>
                customer.id === id ? { ...customer, ...updates, lastUpdated: new Date().toISOString() } : customer
            );
            saveDataToFile('credit-customers.json', updatedCustomers);
            state.addToSyncQueue({ type: 'update-credit-customer', data: { id, updates } });
            return { creditCustomers: updatedCustomers };
        });
      },

      addLoyaltyCustomer: (customer) => {
          set((state) => {
              const updatedCustomers = [...state.loyaltyCustomers, customer];
              saveDataToFile('loyalty-customers.json', updatedCustomers);
              state.addToSyncQueue({ type: 'add-loyalty-customer', data: customer });
              return { loyaltyCustomers: updatedCustomers };
          });
      },

      updateLoyaltyCustomer: (id, updates) => {
          set((state) => {
              const updatedCustomers = state.loyaltyCustomers.map(c =>
                  c.id === id ? { ...c, ...updates } : c
              );
              saveDataToFile('loyalty-customers.json', updatedCustomers);
              state.addToSyncQueue({ type: 'update-loyalty-customer', data: { id, updates } });
              return { loyaltyCustomers: updatedCustomers };
          });
      },

      addCreditPayment: (customerId: string, amount: number, transactionId?: string) => {
        set((state) => {
            const customer = state.creditCustomers.find(c => c.id === customerId);
            if (!customer) return {};

            const newPaidAmount = (customer.paidAmount || 0) + amount;
            const newBalance = (customer.balance || 0) - amount;

            const payment: CreditPayment = {
                id: `CP${Date.now()}`,
                customerId,
                amount,
                date: new Date().toISOString(),
                cashierId: state.currentCashier?.id,
                transactionId
            };

            const updatedPayments = [...state.creditPayments, payment];
            saveDataToFile('credit-payments.json', updatedPayments); // Assuming new file
            state.addToSyncQueue({ type: 'add-credit-payment', data: payment });

            const updatedCustomers = state.creditCustomers.map(c =>
                c.id === customerId
                ? { ...c, paidAmount: newPaidAmount, balance: Math.max(0, newBalance) }
                : c
            );
            saveDataToFile('credit-customers.json', updatedCustomers);
            state.addToSyncQueue({ type: 'update-credit-customer', data: { id: customerId, updates: { paidAmount: newPaidAmount, balance: newBalance } } });

            return {
                creditPayments: updatedPayments,
                creditCustomers: updatedCustomers
            };
        });
      },

      addInventoryLog: (log: InventoryLog) => {
          set((state) => {
              const updatedLogs = [log, ...state.inventoryLogs];
              saveDataToFile('inventory-logs.json', updatedLogs);
              return { inventoryLogs: updatedLogs };
          });
          get().addToSyncQueue({ type: 'add-inventory-log', data: log });
      },

      deleteCreditCustomer: (id) => {
        set((state) => {
          const updatedCustomers = state.creditCustomers.filter(customer => customer.id !== id);
          saveDataToFile('credit-customers.json', updatedCustomers);
          state.addToSyncQueue({ type: 'delete-credit-customer', data: { id } });
          return { creditCustomers: updatedCustomers };
        });
      },

      addExpense: (expense) => {
        set((state) => {
          const updatedExpenses = [expense, ...state.expenses];
          saveDataToFile('expenses.json', updatedExpenses);
          state.addToSyncQueue({ type: 'add-expense', data: expense });
          return { expenses: updatedExpenses };
        });
      },

  updateExpense: (id, updates) => {
    set((state) => {
      const updatedExpenses = state.expenses.map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      );
      saveDataToFile('expenses.json', updatedExpenses);
      // Ensure data has the ID for the backend to identify it
      state.addToSyncQueue({ type: 'update-expense', data: { id, updates } });
      return { expenses: updatedExpenses };
    });
  },

  deleteExpense: (id) => {
    set((state) => {
      const updatedExpenses = state.expenses.filter(expense => expense.id !== id);
      saveDataToFile('expenses.json', updatedExpenses);
      state.addToSyncQueue({ type: 'delete-expense', data: { id } });
      return { expenses: updatedExpenses };
    });
  },

      addSalary: (salary) => {
        set((state) => {
          const updatedSalaries = [salary, ...state.salaries];
          saveDataToFile('salaries.json', updatedSalaries);
          state.addToSyncQueue({ type: 'add-salary', data: salary });
          return { salaries: updatedSalaries };
        });
      },

      deleteSalary: (id) => {
        set((state) => {
          const updatedSalaries = state.salaries.filter(s => s.id !== id);
          saveDataToFile('salaries.json', updatedSalaries);
          state.addToSyncQueue({ type: 'delete-salary', data: { id } });
          return { salaries: updatedSalaries };
        });
      },

      addSupplier: (supplier) => {
        set((state) => ({
          suppliers: [...state.suppliers, supplier],
          syncQueue: [...state.syncQueue, { type: 'ADD_SUPPLIER', data: supplier, timestamp: new Date().toISOString() }]
        }));
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updates } : s),
          syncQueue: [...state.syncQueue, { type: 'UPDATE_SUPPLIER', data: { id, updates }, timestamp: new Date().toISOString() }]
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
          syncQueue: [...state.syncQueue, { type: 'DELETE_SUPPLIER', data: id, timestamp: new Date().toISOString() }]
        }));
      },

      addPurchaseOrder: (po) => 
        set((state) => ({
            purchaseOrders: [...state.purchaseOrders, po],
            syncQueue: [...state.syncQueue, { type: 'ADD_PO', data: po, timestamp: new Date().toISOString() }]
        })),

      updatePurchaseOrder: (id, updates) =>
        set((state) => ({
            purchaseOrders: state.purchaseOrders.map((po) => po.id === id ? { ...po, ...updates } : po),
            syncQueue: [...state.syncQueue, { type: 'UPDATE_PO', data: { id, updates }, timestamp: new Date().toISOString() }]
        })),

      deletePurchaseOrder: (id) =>
        set((state) => ({
            purchaseOrders: state.purchaseOrders.filter((po) => po.id !== id),
            syncQueue: [...state.syncQueue, { type: 'DELETE_PO', data: id, timestamp: new Date().toISOString() }]
        })),
        
      receivePurchaseOrder: (poId) =>
        set((state) => {
            const po = state.purchaseOrders.find(p => p.id === poId);
            if (!po || po.status === 'received') return state;
            
            // Update inventory
            const updatedProducts = state.products.map(product => {
                const poItem = po.items.find(item => item.productId === product.id);
                if (poItem) {
                    return { ...product, stock: (product.stock || 0) + poItem.quantity };
                }
                return product;
            });
            
            return {
                products: updatedProducts,
                purchaseOrders: state.purchaseOrders.map(p => p.id === poId ? { ...p, status: 'received' } : p),
                syncQueue: [...state.syncQueue, { type: 'RECEIVE_PO', data: poId, timestamp: new Date().toISOString() }]
            };
        }),

      migrateLegacyExpenses: async () => {
        const state = get();

        // 1. Ensure "Others" Supplier exists
        let othersSupplier = state.suppliers.find(s => s.name === 'Others');
        let updatedSuppliers = [...state.suppliers];

        if (!othersSupplier) {
            othersSupplier = {
                id: `SUP${Date.now()}`,
                name: 'Others',
                contact: '0740 841 168',
                location: '02-00223 Kagwe',
                active: true,
                notes: 'Legacy Data Container',
                createdAt: new Date().toISOString()
            };
            updatedSuppliers.push(othersSupplier);
            state.addToSyncQueue({ type: 'add-supplier', data: othersSupplier });
        }

        // 2. Find legacy expenses (missing supplierId)
        const expensesToMigrate = state.expenses.filter(e => !e.supplierId);

        if (expensesToMigrate.length === 0 && state.suppliers.length === updatedSuppliers.length) {
            return; // Nothing to do
        }

        const updatedExpenses = state.expenses.map(e => {
            if (!e.supplierId) {
                // Queue update for each expense migration
                // Note: We create a local modified object. The queue needs the ID and updates.
                const updates = { supplierId: othersSupplier!.id, supplierName: 'Others' };
                state.addToSyncQueue({ type: 'update-expense', data: { id: e.id, updates } });
                return { ...e, ...updates };
            }
            return e;
        });

        // 3. Save Changes
        set({ suppliers: updatedSuppliers, expenses: updatedExpenses });
        await saveDataToFile('suppliers.json', updatedSuppliers);
        await saveDataToFile('expenses.json', updatedExpenses);
      },

      saveDocument: (doc) => {
        set((state) => {
          const updatedDocs = [doc, ...state.documents.filter(d => d.id !== doc.id)];
          saveDataToFile('documents.json', updatedDocs);
          return { documents: updatedDocs };
        });
      },

      deleteDocument: (id) => {
        set((state) => {
          const updatedDocs = state.documents.filter(d => d.id !== id);
          saveDataToFile('documents.json', updatedDocs);
          return { documents: updatedDocs };
        });
      },

      saveBusinessSetup: (setup) => {
        saveDataToFile('business-setup.json', setup);
        set((state) => {
            state.addToSyncQueue({ type: 'update-business-setup', data: setup });
            return { businessSetup: setup };
        });
      },
      saveDocumentSettings: (settings) => set((state) => {
          saveDataToFile('document-settings.json', settings);
          return { documentSettings: settings };
      }),

      // Sync operations
      addToSyncQueue: (operation) => {
        set((state) => ({
          syncQueue: [...state.syncQueue, operation]
        }));
        // Debounce: wait 500ms for all items to accumulate before processing
        if ((window as any).__syncDebounceTimer) {
          clearTimeout((window as any).__syncDebounceTimer);
        }
        (window as any).__syncDebounceTimer = setTimeout(() => {
          (window as any).__syncDebounceTimer = null;
          get().processSyncQueue();
        }, 500);
      },

      processSyncQueue: async () => {
        const state = get();
        let rawUrl = state.businessSetup?.lanAdminIp || state.businessSetup?.apiUrl || state.businessSetup?.backOfficeUrl;
        let apiUrl = rawUrl?.replace(/\/$/, '')?.replace(/\/api$/, '') || '';
        const apiKey = state.businessSetup?.backOfficeApiKey || state.businessSetup?.apiKey;

        // Read queue FRESH from store, not from stale snapshot
        const currentQueue = get().syncQueue;
        if (!state.isOnline || currentQueue.length === 0 || !apiUrl || !apiKey) return;

        const queue = [...currentQueue];
        set({ syncQueue: [] }); // Optimistically clear queue

        try {
          const payload = {
              transactions: [] as any[],
              stockMovements: [] as any[],
              products: [] as any[],
              users: [] as any[],
              customers: [] as any[],
              suppliers: [] as any[],
              businessSetup: state.businessSetup
          };

          queue.forEach(item => {
                if (item.type === 'new-transaction' || item.type === 'transaction') {
                    payload.transactions.push(item.data);
                } else if (item.type === 'inventory-log' || item.type === 'add-inventory-log') {
                    const data = item.data;
                    const movement = {
                        id: data.id,
                        productId: data.productId,
                        type: data.type || data.reason || 'SALE',
                        quantity: data.quantity !== undefined ? data.quantity : Math.abs(data.variance || 0),
                        reference: data.reference || '',
                        timestamp: data.timestamp
                    };
                    payload.stockMovements.push(movement);
                } else if (item.type === 'add-product') {
                  const { stock, ...prodWithoutStock } = item.data;
                  payload.products.push(prodWithoutStock);
              } else if (item.type === 'update-product') {
                  const fullProduct = state.products.find(p => p.id === item.data.id);
                  if (fullProduct) {
                      const { stock, ...prodWithoutStock } = fullProduct;
                      payload.products.push(prodWithoutStock);
                  }
              } else if (item.type === 'add-user') {
                  payload.users.push(item.data);
              } else if (item.type === 'update-user') {
                  const fullUser = state.users.find(u => u.id === item.data.id);
                  if (fullUser) payload.users.push(fullUser);
              } else if (item.type === 'add-customer') {
                  payload.customers.push(item.data);
              } else if (item.type === 'update-customer') {
                  const fullC = state.creditCustomers.find(c => c.id === item.data.id);
                  if (fullC) payload.customers.push(fullC);
              } else if (item.type === 'add-supplier') {
                  payload.suppliers.push(item.data);
              } else if (item.type === 'update-supplier') {
                  const fullS = state.suppliers.find(s => s.id === item.data.id);
                  if (fullS) payload.suppliers.push(fullS);
              }
          });

          console.log(`[SYNC PUSH] Queue had ${queue.length} items. Payload: ${payload.transactions.length} txns, ${payload.stockMovements.length} stock movements, ${payload.products.length} products`);

          const response = await fetch(`${apiUrl}/api/sync/delta`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'X-API-KEY': apiKey
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`Sync failed with status: ${response.status}`);
          set({ lastSyncTime: new Date().toISOString() });
        } catch (error) {
          console.error('Sync failed:', error);
          // Put items back in queue if failed
          set((state) => ({ syncQueue: [...queue, ...state.syncQueue] }));
        }
      },

        syncFromServer: async () => {
            const state = get();
              let rawUrl = state.businessSetup?.lanAdminIp || state.businessSetup?.apiUrl || state.businessSetup?.backOfficeUrl;
            let apiUrl = rawUrl?.replace(/\/$/, '')?.replace(/\/api$/, '') || '';
            const apiKey = state.businessSetup?.backOfficeApiKey || state.businessSetup?.apiKey;

            if (!apiUrl || !apiKey) {
                // Silently skip if no API config
                return;
            }

              try {
                const sinceTime = state.lastSyncTime || '2000-01-01T00:00:00.000Z';
                const locationQuery = state.businessSetup?.locationId ? `locationId=${state.businessSetup.locationId}&` : '';
                const outletQuery = state.businessSetup?.outletId ? `outletId=${state.businessSetup.outletId}&` : '';
                const response = await fetch(`${apiUrl}/api/sync/delta?${locationQuery}${outletQuery}since=${encodeURIComponent(sinceTime)}`, {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'X-API-KEY': apiKey
                  }
                });

                if (response.status === 401) {
                   console.error('API Key invalid or revoked. Resetting POS registration.');
                   get().setSyncStatus({ error: 'API Key invalid or revoked. Please reset POS registration in Settings.', isSyncing: false, currentTask: 'Sync failed' });
                   return;
                }

              if (!response.ok) {
                 return;
              }

const serverData = await response.json();
                if (serverData && serverData.success) {
                    const payload = serverData.data || serverData;
                    set({ lastSyncTime: serverData.timestamp || new Date().toISOString() });

                      // 1. Write directly to local SQLite database via IPC to maintain .wpos compatibility
                      if (window.electron && window.electron.mergeData) {
                          const mergePromises = [];
                          if (payload.products?.length > 0) mergePromises.push(window.electron.mergeData('products.json', payload.products));
                          if (payload.users?.length > 0) mergePromises.push(window.electron.mergeData('users.json', payload.users));
                          if (payload.categories?.length > 0) mergePromises.push(window.electron.mergeData('categories.json', payload.categories));
                          if (payload.outlets?.length > 0) mergePromises.push(window.electron.mergeData('outlets.json', payload.outlets));
                          if (payload.terminals?.length > 0) mergePromises.push(window.electron.mergeData('terminals.json', payload.terminals));
                          if (payload.customers?.length > 0) mergePromises.push(window.electron.mergeData('credit-customers.json', payload.customers));
                          if (payload.suppliers?.length > 0) mergePromises.push(window.electron.mergeData('suppliers.json', payload.suppliers));
                          if (payload.transactions?.length > 0) mergePromises.push(window.electron.mergeData('transactions.json', payload.transactions));
                          if (payload.businessSetup) {
                              const safeBusinessSetup = { ...payload.businessSetup };
                              delete safeBusinessSetup.apiKey;
                              delete safeBusinessSetup.terminalName;
                              delete safeBusinessSetup.outletId;
                              delete safeBusinessSetup.isSetup;
                              delete safeBusinessSetup.isLoggedIn;

                              // If locationId changed (e.g. stale backup value), force a full re-sync
                              const currentLocationId = state.businessSetup?.locationId;
                              if (safeBusinessSetup.locationId && currentLocationId && safeBusinessSetup.locationId !== currentLocationId) {
                                console.log(`[SYNC] locationId changed: ${currentLocationId} → ${safeBusinessSetup.locationId}. Resetting lastSyncTime for full re-sync.`);
                                set({ lastSyncTime: null });
                              }

                              mergePromises.push(window.electron.mergeData('business-setup.json', safeBusinessSetup));
                          }
                          
                          // We also save sync-metadata to SQLite
                          mergePromises.push(window.electron.mergeData('sync-metadata.json', { lastPullSync: serverData.timestamp || new Date().toISOString() }));
                          
                          await Promise.all(mergePromises);

                          // Apply server stock movements idempotently
                          if (payload.stockMovements?.length > 0) {
                              const movResult = await window.electron.applyStockMovements(payload.stockMovements);
                              console.log(`[SYNC] Applied ${movResult.applied} stock movements from server`);
                          }
                      }

                    // 2. Refresh UI by fully re-reading the merged local SQLite database state
                    if (window.electron && window.electron.readData) {
                        const [products, users, expenses, salaries, creditCustomers, loyaltyCustomers, suppliers, businessSetup, categories] = await Promise.all([
                            window.electron.readData('products.json'),
                            window.electron.readData('users.json'),
                            window.electron.readData('expenses.json'),
                            window.electron.readData('salaries.json'),
                            window.electron.readData('credit-customers.json'),
                            window.electron.readData('loyalty-customers.json'),
                            window.electron.readData('suppliers.json'),
                            window.electron.readData('business-setup.json'),
                            window.electron.readData('categories.json')
                        ]);

                        // --- Developer Console Sync Logging ---
                        console.log(`[DEBUG] payload.products len:`, payload.products?.length, `products.data len:`, products?.data?.length);
                        console.groupCollapsed('%c🟢 Data Pulled From Server & Saved to Local DB', 'color: #007bff; font-weight: bold;');
                        if (payload.users?.length) console.log(`👤 Users Updated (${payload.users.length})`);
                        if (payload.products?.length) console.log(`📦 Products Updated (${payload.products.length})`);
                        if (!payload.users?.length && !payload.products?.length) console.log('No new updates since last sync.');
                        console.log(`⏱️ Sync Timestamp: ${new Date().toLocaleTimeString()}`);
                        console.groupEnd();
                        // -------------------------------------

                        set({
                            products: products.data as Product[],
                            users: users.data as User[],
                            expenses: expenses.data as Expense[],
                            salaries: salaries.data as Salary[],
                            creditCustomers: creditCustomers.data as CreditCustomer[],
                            loyaltyCustomers: loyaltyCustomers.data as LoyaltyCustomer[],
                            businessSetup: businessSetup.data as BusinessSetup,
                            suppliers: suppliers.data as Supplier[],
                            categories: Array.isArray(categories.data) ? categories.data.map((c: any) => c.name || c) : [],
                        });
                    }
                }
              } catch (error) {
                // Silently handle sync errors
            }
        },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline) {
          get().processSyncQueue();
          get().syncFromServer(); // Also pull data when coming online
        }
      },

      // Handle data synced from mobile (bridge)
      handleMobileDataSync: (payload: any) => {
        if (!Array.isArray(payload)) payload = [payload];

        payload.forEach(item => {
            const { type, data } = item;

            // Add to sync queue for Back Office propagation
            get().addToSyncQueue({ type, data });

            // Update local state immediately for UI responsiveness
            if (type === 'new-transaction' || type === 'transaction') {
               set(state => {
                   if (state.transactions.some(t => t.id === data.id)) return {};
                   return { transactions: [data, ...state.transactions] };
               });
            } else if (type === 'add-expense') {
               set(state => {
                   if (state.expenses.some(e => (e.id || (e as any).expenseId) === (data.id || data.expenseId))) return {};
                   return { expenses: [data, ...state.expenses] };
               });
            } else if (type === 'add-salary') {
               set(state => {
                   if (state.salaries.some(s => s.id === data.id)) return {};
                   return { salaries: [data, ...state.salaries] };
               });
            } else if (type === 'add-credit-customer') {
               set(state => {
                   if (state.creditCustomers.some(c => c.id === data.id)) return {};
                   return { creditCustomers: [...state.creditCustomers, data] };
               });
            } else if (type === 'update-credit-customer') {
               set(state => {
                   return {
                       creditCustomers: state.creditCustomers.map(c =>
                           c.id === data.id ? { ...c, ...data.updates } : c
                       )
                   };
               });
            } else if (type === 'add-supplier') {
               set(state => {
                   if (state.suppliers.some(s => s.id === data.id)) return {};
                   return { suppliers: [...state.suppliers, data] };
               });
            } else if (type === 'update-supplier') {
               set(state => {
                   return {
                       suppliers: state.suppliers.map(s =>
                           s.id === data.id ? { ...s, ...data.updates } : s
                       )
                   };
               });
            }
        });
      },

      // Mobile Receipts Logic
      loadMobileReceipts: async () => {
        const { data } = await readDataFromFile('mobile-receipts.json');
        if (data) set({ mobileReceipts: data });
      },

      addMobileReceipt: (receipt) => {
        set(state => ({ mobileReceipts: [...state.mobileReceipts, receipt] }));
      },

      printMobileReceipt: (receipt) => {
        const state = get();
        if (window.electron) {
            // Print as Original (false)
            window.electron.printReceipt(receipt, state.businessSetup, false);

            // Save to Local Transactions (Old Receipts)
            if (!state.transactions.some(t => t.id === receipt.id)) {
                 state.saveTransaction(receipt);
            }

            state.deleteMobileReceipt(receipt);
        }
      },

      deleteMobileReceipt: (receipt) => {
        set(state => {
            const newReceipts = state.mobileReceipts.filter(r => r._printId !== receipt._printId);
            saveDataToFile('mobile-receipts.json', newReceipts);
            return { mobileReceipts: newReceipts };
        });
      },

      // Reports
      getDailySales: (date: string) => {
        const state = get();

        // Check archived summaries first
        if (state.dailySummaries && state.dailySummaries[date]) {
            const s = state.dailySummaries[date];
            return { cash: s.cashTotal, mpesa: s.mpesaTotal, credit: s.creditTotal, total: s.totalSales };
        }

        const dayTransactions = state.transactions.filter(t =>
          t.timestamp.startsWith(date) && t.status === 'completed'
        );

        const cash = dayTransactions
          .filter(t => t.paymentMethod === 'cash')
          .reduce((sum, t) => sum + t.total, 0);

        const mpesa = dayTransactions
          .filter(t => t.paymentMethod === 'mpesa')
          .reduce((sum, t) => sum + t.total, 0);

        const credit = dayTransactions
          .filter(t => t.paymentMethod === 'credit')
          .reduce((sum, t) => sum + t.total, 0);

        return { cash, mpesa, credit, total: cash + mpesa + credit };
      },

      getDailyClosingReport: (date) => {
        const state = get();
        const dayTransactions = state.transactions.filter(t =>
          t.timestamp.startsWith(date) && t.status === 'completed'
        );

        // Calculate Global Items Sold
        const globalItemSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
        dayTransactions.forEach(t => {
            if (!t || !Array.isArray(t.items)) return;

            t.items.forEach(item => {
                if (!item || !item.product) return;

                const name = item.product.name || 'Unknown Product';
                const price = item.product.price || 0;

                if (!globalItemSalesMap.has(name)) {
                    globalItemSalesMap.set(name, { name, quantity: 0, total: 0 });
                }
                const record = globalItemSalesMap.get(name)!;
                record.quantity += (item.quantity || 0);
                record.total += ((item.quantity || 0) * price);
            });
        });
        const itemSales = Array.from(globalItemSalesMap.values()).sort((a, b) => b.total - a.total);

        // Group by Cashier
        const cashierNames = [...new Set(dayTransactions.map(t => t.cashier || 'Unknown'))];

        const cashiers: any[] = cashierNames.map(name => {
          const transactions = dayTransactions.filter(t => (t.cashier || 'Unknown') === name);
          const cashTotal = transactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0);
          const mpesaTotal = transactions.filter(t => t.paymentMethod === 'mpesa').reduce((sum, t) => sum + t.total, 0);
          const creditTotal = transactions.filter(t => t.paymentMethod === 'credit').reduce((sum, t) => sum + t.total, 0);

          // Items sold by this cashier
          const itemSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
          transactions.forEach(t => {
              if (!t || !Array.isArray(t.items)) return;

              t.items.forEach(item => {
                  if (!item || !item.product) return;

                  const name = item.product.name || 'Unknown Product';
                  const price = item.product.price || 0;

                  if (!itemSalesMap.has(name)) {
                      itemSalesMap.set(name, { name, quantity: 0, total: 0 });
                  }
                  const record = itemSalesMap.get(name)!;
                  record.quantity += (item.quantity || 0);
                  record.total += ((item.quantity || 0) * price);
              });
          });
          const items = Array.from(itemSalesMap.values()).sort((a, b) => b.total - a.total);

          return {
            cashierName: name,
            items,
            transactions,
            totalSales: cashTotal + mpesaTotal + creditTotal,
            cashTotal,
            mpesaTotal,
            creditTotal,
          };
        });

        const totalCash = cashiers.reduce((sum, c) => sum + c.cashTotal, 0);
        const totalMpesa = cashiers.reduce((sum, c) => sum + c.mpesaTotal, 0);
        const totalCredit = cashiers.reduce((sum, c) => sum + c.creditTotal, 0);

        return {
          date,
          cashiers,
          itemSales,
          grandTotal: totalCash + totalMpesa + totalCredit,
          totalCash,
          totalMpesa,
          totalCredit,
        };
      },

      getTransactionsByDateRange: (startDate, endDate) => {
        const state = get();
        return state.transactions.filter(t => {
          const date = new Date(t.timestamp);
          return date >= new Date(startDate) && date <= new Date(endDate);
        });
      },

      getUnpaidCredits: () => {
        const state = get();
        return state.creditCustomers.filter(customer => (customer.balance || 0) > 0);
      },

      // New: Load Users explicitly
      loadUsers: async () => {
          if (window.electron) {
              const { data } = await window.electron.readData('users.json');
              if (data) set({ users: data });
          }
      },

      addUser: async (user) => {
        // Strict IPC Only
        if (window.electron && window.electron.userManagement) {
             const result = await window.electron.userManagement.addUser(user);
             if (result.success) {
                 await get().loadUsers(); // Re-fetch to ensure sync with backend
             }
        }
        // Do not update local state optimistically to avoid reverts
        // Do not add to sync queue here, let backend handle it or separate sync logic
      },

  deleteTransactions: (ids) => {
    set((state) => {
      const updatedTransactions = state.transactions.filter(t => !ids.includes(t.id));
      saveDataToFile('transactions.json', updatedTransactions);
      ids.forEach(id => state.addToSyncQueue({ type: 'delete-transaction', data: { id } }));
      return { transactions: updatedTransactions };
    });
  },

      addProduct: async (product) => {
        const state = get();
        if (product.image && !product.image.startsWith('http')) {
          try {
            const { path: localPath } = await window.electron.saveImage(product.image);
            product.localImage = localPath;

            if (state.isOnline) {
              const { imageUrl } = await window.electron.uploadImage(product.image, state.businessSetup.apiUrl, state.businessSetup.apiKey);
              product.image = imageUrl;
            } else {
              product.image = '';
              state.addToSyncQueue({ type: 'upload-image', data: { productId: product.id, path: product.image } });
            }
          } catch (error) {
            console.error('Image handling failed:', error);
            product.image = '';
          }
        }

        set((state) => {
          const updatedProducts = [...state.products, product];
          saveDataToFile('products.json', updatedProducts);
          state.addToSyncQueue({ type: 'add-product', data: product });
          return { products: updatedProducts };
        });
      },

      updateProduct: async (id, updates) => {
        const state = get();
        if (updates.image && !updates.image.startsWith('http')) {
          try {
            const { path: localPath } = await window.electron.saveImage(updates.image);
            updates.localImage = localPath;

            if (state.isOnline) {
              const { imageUrl } = await window.electron.uploadImage(updates.image, state.businessSetup.apiUrl, state.businessSetup.apiKey);
              updates.image = imageUrl;
            } else {
              updates.image = '';
              state.addToSyncQueue({ type: 'upload-image', data: { productId: id, path: updates.image } });
            }
          } catch (error) {
            console.error('Image handling failed:', error);
            updates.image = '';
          }
        }

        set((state) => {
          const updatedProducts = state.products.map(product =>
            product.id === id ? { ...product, ...updates } : product
          );
          saveDataToFile('products.json', updatedProducts);
          state.addToSyncQueue({ type: 'update-product', data: { id, updates } });
          return { products: updatedProducts };
        });
      },

      deleteProduct: (id) => {
        set((state) => {
          const updatedProducts = state.products.filter(product => product.id !== id);
          saveDataToFile('products.json', updatedProducts);
          state.addToSyncQueue({ type: 'delete-product', data: { id } });
          return { products: updatedProducts };
        });
      },

      setCategories: (categories) => {
        set({ categories });
        saveDataToFile('categories.json', categories);
      },

      addCategory: (category) => {
        set((state) => {
          if (state.categories.includes(category)) return {};
          const updatedCategories = [...state.categories, category];
          saveDataToFile('categories.json', updatedCategories);
          return { categories: updatedCategories };
        });
      },

      deleteCategory: (category) => {
        set((state) => {
          const updatedCategories = state.categories.filter(c => c !== category);
          saveDataToFile('categories.json', updatedCategories);
          return { categories: updatedCategories };
        });
      },

      updateUser: async (id, updates) => {
        // Strict IPC Only
        if (window.electron && window.electron.userManagement) {
             const result = await window.electron.userManagement.updateUser(id, updates);
             if (result.success) {
                 await get().loadUsers(); // Re-fetch

                 // Handle Session Updates
                 const state = get();
                 if (state.currentCashier && state.currentCashier.id === id) {
                      if (updates.isActive === false) {
                          set({ currentCashier: null, sessionToken: null, businessSetup: { ...state.businessSetup, isLoggedIn: false } });
                      } else {
                          set({ currentCashier: { ...state.currentCashier, ...updates } });
                      }
                 }
             }
        }
      },

      deleteUser: async (id) => {
        // Strict IPC Only
        if (window.electron && window.electron.userManagement) {
             const result = await window.electron.userManagement.deleteUser(id);
             if (result.success) {
                 await get().loadUsers(); // Re-fetch

                 const state = get();
                 if (state.currentCashier && state.currentCashier.id === id) {
                      set({ currentCashier: null, sessionToken: null, businessSetup: { ...state.businessSetup, isLoggedIn: false } });
                 }
             }
        }
      },

      loadInitialData: async () => {
        try {
          // Prioritize loading business setup first.
          const { data: businessSetupData } = await readDataFromFile('business-setup.json');
          let isSetup = false;
          if (businessSetupData && businessSetupData.isSetup) {
            // Check if we have env vars to override/set defaults for Back Office
            const updatedBusinessSetup = { ...businessSetupData };
            if (!updatedBusinessSetup.backOfficeUrl && import.meta.env.VITE_BACK_OFFICE_URL) {
                updatedBusinessSetup.backOfficeUrl = import.meta.env.VITE_BACK_OFFICE_URL;
            }
            if (!updatedBusinessSetup.backOfficeApiKey && import.meta.env.VITE_BACK_OFFICE_API_KEY) {
                updatedBusinessSetup.backOfficeApiKey = import.meta.env.VITE_BACK_OFFICE_API_KEY;
            }

            set({ businessSetup: updatedBusinessSetup });
            isSetup = true;
          } else if (businessSetupData && !businessSetupData.isSetup) {
             // Pre-fill setup data if available from env, even if not setup
              const prefillSetup = { ...businessSetupData };
              if (import.meta.env.VITE_BACK_OFFICE_URL) prefillSetup.backOfficeUrl = import.meta.env.VITE_BACK_OFFICE_URL;
              if (import.meta.env.VITE_BACK_OFFICE_API_KEY) prefillSetup.backOfficeApiKey = import.meta.env.VITE_BACK_OFFICE_API_KEY;
              set({ businessSetup: prefillSetup });
          }

          const fileNames = ['products.json', 'users.json', 'transactions.json', 'credit-customers.json', 'expenses.json', 'salaries.json', 'credit-payments.json', 'inventory-logs.json', 'daily-summaries.json', 'loyalty-customers.json', 'suppliers.json', 'documents.json', 'document-settings.json'];
          const dataMap = {
            'products.json': 'products',
            'users.json': 'users',
            'transactions.json': 'transactions',
            'credit-customers.json': 'creditCustomers',
            'expenses.json': 'expenses',
            'salaries.json': 'salaries',
            'credit-payments.json': 'creditPayments',
            'inventory-logs.json': 'inventoryLogs',
            'daily-summaries.json': 'dailySummaries',
            'loyalty-customers.json': 'loyaltyCustomers',
            'suppliers.json': 'suppliers',
            'documents.json': 'documents',
            'document-settings.json': 'documentSettings'
          };

          // Load Categories
          const { data: catData } = await readDataFromFile('categories.json');
          if (catData && Array.isArray(catData)) {
            const normalized = catData.map((c: any) => c.name || c);
            set({ categories: normalized });
          }

          for (const fileName of fileNames) {
            const { data } = await readDataFromFile(fileName);
            if (data) {
              // Sanitize Data on Initial Load
              const key = dataMap[fileName];
              if (Array.isArray(data)) {
                  let hasChanges = false;

                  // 1. Sanitize IDs
                  let sanitizedData = data.map((item: any) => {
                      if (!item.id || String(item.id) === 'null' || String(item.id) === 'NaN') {
                          hasChanges = true;
                          // Use Stable ID for products to fix previous random ID generation issues
                          let newId;
                          if (key === 'products' && item.name) {
                              newId = generateStableId(item.name);
                          } else {
                              newId = key === 'products' ? generateRandomId() : `FIX${Date.now()}${Math.floor(Math.random() * 1000)}`;
                          }
                          return { ...item, id: newId };
                      }
                      return item;
                  });

                  // 2. Filter out products with 0 price or empty names and Deduplicate Products by Name (Emergency Cleanup for "1000 items")
                  if (key === 'products') {
                      const initialLength = sanitizedData.length;

                      // Remove products with empty names or 0 price
                      sanitizedData = sanitizedData.filter((p: any) => {
                          if (!p.name || p.name.trim() === '') return false;
                          const price = Number(p.price);
                          return !isNaN(price) && price > 0;
                      });

                      const uniqueProductsByName = new Map();

                      sanitizedData.forEach((p: any) => {
                          if (!p.productId || String(p.productId) === 'null' || String(p.productId) === 'NaN') {
                              p.productId = p.id; // ensure productId exists
                          }

                          const nameKey = p.name.trim().toLowerCase();
                          if (!uniqueProductsByName.has(nameKey)) {
                              uniqueProductsByName.set(nameKey, p);
                          } else {
                              // If duplicate exists, keep the one with higher stock
                              const existing = uniqueProductsByName.get(nameKey);
                              const existingStock = Number(existing.stock) || 0;
                              const newStock = Number(p.stock) || 0;
                              if (newStock > existingStock) {
                                  uniqueProductsByName.set(nameKey, p);
                              }
                          }
                      });

                      sanitizedData = Array.from(uniqueProductsByName.values());
                      if (sanitizedData.length !== initialLength) {
                          hasChanges = true;
                          console.log(`Deduplicated/Cleaned products: Reduced from ${initialLength} to ${sanitizedData.length}`);
                      }
                  }

                  // 3. Deduplicate by ID
                  const uniqueMap = new Map();
                  sanitizedData.forEach((item: any) => uniqueMap.set(String(item.id), item));
                  let finalData = Array.from(uniqueMap.values());

                  // 4. Extra deduplication for Credit Customers by Name and Phone
                  if (key === 'creditCustomers') {
                      const uniqueCustomersByName = new Map();
                      const initialLength = finalData.length;

                      finalData.forEach((c: any) => {
                          // Try to use name, fallback to phone, then ID
                          const nameKey = c.name ? c.name.trim().toLowerCase() : (c.phone ? c.phone.trim() : String(c.id));
                          if (!uniqueCustomersByName.has(nameKey)) {
                              uniqueCustomersByName.set(nameKey, c);
                          } else {
                              // Keep the one with highest balance, or merge details
                              const existing = uniqueCustomersByName.get(nameKey);
                              const existingBalance = Number(existing.balance) || 0;
                              const newBalance = Number(c.balance) || 0;
                              if (newBalance > existingBalance) {
                                  uniqueCustomersByName.set(nameKey, { ...existing, ...c, balance: newBalance });
                              }
                          }
                      });

                      finalData = Array.from(uniqueCustomersByName.values());
                      if (finalData.length !== initialLength) {
                          hasChanges = true;
                          console.log(`Deduplicated credit customers: Reduced from ${initialLength} to ${finalData.length}`);
                      }
                  }

                  if (finalData.length !== data.length) hasChanges = true;

                  // If data was corrected, save it back immediately to persist the fix
                  if (hasChanges) {
                      console.log(`Repaired/Deduplicated data in ${fileName}`);
                      await saveDataToFile(fileName, finalData);
                  }

                  // Update categories automatically based on unique categories from products
                  if (key === 'products') {
                      const state = get();
                      const existingCategories = new Set(state.categories);
                      let newCategoriesFound = false;

                      finalData.forEach((p: any) => {
                          if (p.category && typeof p.category === 'string') {
                              const cat = p.category.trim();
                              if (cat !== '' && !existingCategories.has(cat)) {
                                  existingCategories.add(cat);
                                  newCategoriesFound = true;
                              }
                          }
                      });

                      if (newCategoriesFound) {
                          const updatedCategories = Array.from(existingCategories);
                          set({ categories: updatedCategories });
                          await saveDataToFile('categories.json', updatedCategories);
                      }
                  }

                  set({ [key]: finalData });

              } else {
                  set({ [key]: data });
              }
            }
          }

        } catch (error) {
          console.error("Failed to load initial data:", error);
          // Handle error appropriately, maybe set an error state
        } finally {
          set({ isDataLoaded: true });
        }
      },

      finishSetup: async (businessData, adminUser) => {
        const fullBusinessData: BusinessSetup = {
          ...businessData,
          receiptFooter: 'Developed and Managed by Whizpoint Solutions\nContact: 0740-841-168',
          printerType: businessData.printerType || 'thermal', // Default to thermal
          createdAt: new Date().toISOString(),
        };

        const fullAdminUser: User = {
          ...adminUser,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        // 1. Save the business setup to file.
        await saveDataToFile('business-setup.json', fullBusinessData);

        // 2. Add the first admin user via the secure IPC channel.
        if (window.electron && window.electron.userManagement) {
             try {
                await window.electron.userManagement.addUser(fullAdminUser);
             } catch (e) {
                 console.error("Failed to add admin user during setup:", e);
             }
        }

        // 3. Trigger the business setup printout.
        if (window.electron && window.electron.printBusinessSetup) {
          window.electron.printBusinessSetup(fullBusinessData, fullAdminUser);
        }

        // Note: We intentionally do NOT update the store state 'businessSetup' here.
        // This prevents App.tsx from immediately unmounting the registration page,
        // allowing the user to see the "All caught up" screen.
        // The page will reload and pick up the new state when the user clicks "Go to Login".
      },

      archiveTransactions: async (daysToKeep) => {
          const state = get();
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
          cutoffDate.setHours(0, 0, 0, 0);

          const toKeep: Transaction[] = [];
          const toArchive: Transaction[] = [];

          state.transactions.forEach(t => {
              const tDate = new Date(t.timestamp);
              if (tDate < cutoffDate) {
                  toArchive.push(t);
              } else {
                  toKeep.push(t);
              }
          });

          if (toArchive.length === 0) return;

          const newSummaries = { ...(state.dailySummaries || {}) };

          toArchive.forEach(t => {
              // Use local date string YYYY-MM-DD
              const date = new Date(t.timestamp).toLocaleDateString('en-CA');

              if (!newSummaries[date]) {
                  newSummaries[date] = {
                      date,
                      totalSales: 0,
                      cashTotal: 0,
                      mpesaTotal: 0,
                      creditTotal: 0,
                      expenseTotal: 0,
                      transactionCount: 0
                  };
              }
              const s = newSummaries[date];
              s.totalSales += t.total;
              s.transactionCount += 1;
              if (t.paymentMethod === 'cash') s.cashTotal += t.total;
              if (t.paymentMethod === 'mpesa') s.mpesaTotal += t.total;
              if (t.paymentMethod === 'credit') s.creditTotal += t.total;
          });

          set({ transactions: toKeep, dailySummaries: newSummaries });
          await saveDataToFile('transactions.json', toKeep);
          await saveDataToFile('daily-summaries.json', newSummaries);
      },

      
      pullDeltaFromServer: async () => {
        const state = get();
        if (state.syncStatus.isSyncing) return;
        
        get().setSyncStatus({ isSyncing: true, progress: 10, currentTask: 'Pulling delta sync...', error: null });
        try {
            const since = state.lastSyncTime || new Date(0).toISOString();
            const locationId = state.businessSetup?.locationId;
            const outletId = state.businessSetup?.outletId;
            
            get().setSyncStatus({ progress: 50, currentTask: 'Downloading changes from server' });
            
            const response = await NetworkClient.pullDeltaSync(since, locationId, outletId);
            
            if (response && response.success && response.data) {
                // Merge data back into local state
                get().setSyncStatus({ progress: 90, currentTask: 'Merging data locally' });
                // Note: For a robust app, we'd iterate and merge by ID here. 
                // For simplicity in this architectural demo, we'll just log success.
                // In production, we'd do:
                // set((state) => ({ products: mergeArrays(state.products, response.data.products), ... }))
            }
            
            get().setSyncStatus({ progress: 100, currentTask: 'Pull complete', isSyncing: false });
        } catch (error: any) {
            console.error('Pull sync error:', error);
            if (error.message && error.message.includes('401')) {
                console.error('API Key invalid or revoked during Pull. Resetting POS registration.');
                get().setSyncStatus({ error: 'API Key invalid or revoked. Please reset POS registration in Settings.', isSyncing: false, currentTask: 'Sync failed' });
                return;
            }
            get().setSyncStatus({ error: error.message, isSyncing: false, currentTask: 'Pull failed' });
        }
      },

      pushDataToServer: async () => {
        const state = get();
        if (state.syncStatus.isSyncing) return;

        if (!state.isOnline) {
            console.error("Cannot push data: App is offline");
            return;
        }

        get().setSyncStatus({ isSyncing: true, progress: 10, currentTask: 'Preparing push payload...', error: null });

        try {
            // Delta Payload - Ideally filter by updatedAt > lastSyncTime
            const payload = {
                products: state.products,
                users: state.users,
                expenses: state.expenses,
                salaries: state.salaries,
                customers: state.creditCustomers,
                transactions: state.transactions,
                businessSetup: state.businessSetup,
                suppliers: state.suppliers,
                stockMovements: state.inventoryLogs.filter((data: any) => !data.id?.startsWith('MOV_')).map((data: any) => ({
                    id: data.id || `mov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    productId: data.productId,
                    locationId: state.businessSetup?.locationId,
                    outletId: state.businessSetup?.outletId,
                    type: data.type || (data.variance < 0 ? 'SALE' : 'ADJUSTMENT_UP'),
                    quantity: Math.abs(data.variance || 0),
                    reference: data.reference || data.reason || 'Sync',
                    sourceTerminal: 'POS',
                    timestamp: data.timestamp || new Date().toISOString(),
                    updatedAt: data.timestamp || new Date().toISOString()
                }))
            };

            get().setSyncStatus({ progress: 50, currentTask: 'Uploading to Network Client' });
            
            await NetworkClient.pushDeltaSync(payload);

            get().setSyncStatus({ progress: 100, currentTask: 'Push successful' });
            set({ lastSyncTime: new Date().toISOString() });
            
            // Auto trigger pull after push to ensure consistency
            setTimeout(() => {
                get().pullDeltaFromServer();
            }, 1000);
            
        } catch (error: any) {
            console.error('Push sync error:', error);
            if (error.message && error.message.includes('401')) {
                console.error('API Key invalid or revoked during Push. Resetting POS registration.');
                get().setSyncStatus({ error: 'API Key invalid or revoked. Please reset POS registration in Settings.', isSyncing: false, currentTask: 'Sync failed' });
                return;
            }
            get().setSyncStatus({ error: error.message, currentTask: 'Push failed' });
        } finally {
            setTimeout(() => get().setSyncStatus({ isSyncing: false }), 2000);
        }
      },

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        businessSetup: state.businessSetup,
        isSidebarCollapsed: state.isSidebarCollapsed,
        currentCashier: state.currentCashier,
        transactions: state.transactions ? state.transactions.slice(-100) : [],
        dailySummaries: state.dailySummaries,
        creditCustomers: state.creditCustomers,
        creditPayments: state.creditPayments,
        inventoryLogs: state.inventoryLogs, // Persist inventory logs
        users: state.users,
        expenses: state.expenses ? state.expenses.slice(-50) : [],
        lastSyncTime: state.lastSyncTime,
        products: state.products ? state.products.slice(-100) : [],
        inventoryProducts: state.inventoryProducts,
        loyaltyCustomers: state.loyaltyCustomers,
        syncHistory: state.syncHistory ? state.syncHistory.slice(-50) : [],
        suppliers: state.suppliers,
        documents: state.documents,
      })
    }
  )
);

// Initial data will be loaded in the main App component.

// Sync intervals are now managed in App.tsx to ensure proper lifecycle and state access
