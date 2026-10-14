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
  amountTendered?: number;
  change?: number;
  mpesaCode?: string;
  phoneNumber?: string;
  mpesaName?: string;
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
  mpesaConfig?: {
    enabled: boolean;
    backendUrl: string;
    apiKey: string;
  };
}
