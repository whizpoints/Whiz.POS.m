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
  minStockLevel?: number;
  barcode?: string;
  productId?: string;
  expiryDate?: string;
  batchNumber?: string;
  supplier?: string;
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
  paymentMethod: 'cash' | 'mpesa' | 'credit' | 'card' | 'bank';
  cashier: string;
  creditCustomer?: string;
  status: 'completed' | 'pending' | 'refunded';
  amountTendered?: number;
  change?: number;
  mpesaCode?: string;
  phoneNumber?: string;
  mpesaName?: string;
  customerName?: string;
  kraDetails?: {
    qrCode?: string;
    invoiceNumber?: string;
    date?: string;
    receiptNumber?: string;
    url?: string;
    controlCode?: string;
  };
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  totalCredit: number;
  paidAmount: number;
  balance: number;
  transactions: string[];
  company?: string;
  email?: string;
  address?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  createdAt: string;
  password?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  timestamp: string;
  cashier: string;
  receipt?: string;
}

export interface InventoryLog {
  id: string;
  productId: number;
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

export interface BusinessSetup {
  mpesaEnv?: string;
  cardMode?: string;
  cardGateway?: string;
  etimsEnv?: string;
  developerPin?: string;
  locationId?: string;
  outletName?: string;
  businessName: string;
  businessId?: string;
  id?: string;
  terminalName?: string;
  outletId?: string;
  deviceRole?: string;
  kraPin?: string;
  etimsPin?: string;
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
  printerPaperWidth?: number;
  isSetup: boolean;
  isLoggedIn: boolean;
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
  kraEnabled?: boolean;
  kraEndpoint?: string;
  disableReceiptPrinting?: boolean;
  showDeveloperFooter?: boolean;
  billModeEnabled?: boolean;
  hospitalityReceiptPrinting?: boolean;
  printDuplicateReceipts?: boolean;
  autoDeleteOldBackups?: boolean;
  backupRetentionDays?: number;
  mpesaConfig?: {
    enabled: boolean;
    backendUrl: string;
    apiKey: string;
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
    shortcode?: string;
    partyB?: string;
    callbackUrl?: string;
    type?: 'Paybill' | 'Till';
    environment?: 'Sandbox' | 'Production';
  };
}

export interface OpenBill {
  id: string; // e.g. "BILL-1001"
  tableNumber: string; // e.g. "Table 4" or "Bar 2"
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  cashier: string;
  createdAt: string;
  status: 'open' | 'settled' | 'cancelled';
  notes?: string;
}
