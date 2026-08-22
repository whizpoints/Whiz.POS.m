export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  localImage?: string;
  available: boolean;
  stock?: number;
  minStock?: number;
  barcode?: string;
  sku?: string;
  taxCategory?: 'A' | 'B' | 'C' | 'D' | 'E';
  unitType?: 'pcs' | 'kg' | 'g' | 'ltr' | 'box';
  batchNumber?: string;
  expiryDate?: string;
  parentId?: string;
  unitsPerParent?: number;
  costPrice?: number;
  supplierId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  lineDiscount?: number;
  priceOverride?: boolean;
  managerId?: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  taxBreakdown?: Record<string, number>;
  totalDiscount?: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'credit' | 'split';
  paymentAllocations?: {
    cash?: number;
    mpesa?: number;
    card?: number;
    credit?: number;
  };
  cashier: string;
  creditCustomer?: string;
  status: 'completed' | 'pending' | 'refunded' | 'voided';
  amountTendered?: number;
  change?: number;
  mpesaCode?: string;
  phoneNumber?: string;
  cardReference?: string;
  etimsStatus?: 'PENDING_TAX_SYNC' | 'SYNCED' | 'FAILED';
  etimsCuInvoiceNumber?: string;
  etimsQrCode?: string;
}

export interface LedgerEntry {
  id: string;
  transactionId?: string;
  tenantId: string;
  accountType: 'CASH' | 'MPESA' | 'CARD' | 'CREDIT' | 'INVENTORY' | 'EXPENSE';
  debit: number;
  credit: number;
  reference?: string;
  payerName?: string;
  timestamp: string;
  description: string;
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
  role: 'SYSTEM_ADMIN' | 'STORE_MANAGER' | 'SUPERVISOR' | 'CASHIER';
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
  locationId?: string;
  outletId?: string;
  outletName?: string;
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
  locationId?: string;
  locationName?: string;
  autoLogoffEnabled?: boolean;
  autoLogoffMinutes?: number;
  deviceRole?: 'CashierTerminal' | 'BackOfficeMode' | 'HybridMode';
  cashDrawerMode?: 'disabled' | 'auto_pulse' | 'manual_only';
  scaleMode?: 'disabled' | 'manual_input' | 'rs232' | 'barcode_prefix_20';
  receiptMode?: 'auto_print' | 'print_on_request' | 'digital_only';
  printerChannel?: 'usb' | 'network' | 'bluetooth';
  mpesaEnv?: 'sandbox' | 'live';
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaPasskey?: string;
  mpesaCallbackDomain?: string;
  mpesaInitiatorName?: string;
  mpesaInitiatorPassword?: string;
  cardMode?: 'standalone' | 'integrated';
  cardGateway?: 'paystack' | 'flutterwave' | 'bank_api';
  cardSimulator?: boolean;
  etimsEnv?: 'sandbox' | 'live';
  etimsPin?: string;
  etimsBranchId?: string;
  etimsDeviceSerial?: string;
  whatsappApiKey?: string;
  whatsappPhoneId?: string;
}

export interface EtimsQueueRecord {
  id: string;
  transactionId: string;
  payload: any;
  status: 'PENDING_TAX_SYNC' | 'FAILED';
  retryCount: number;
  timestamp: string;
}

export interface ShiftReconciliation {
  id: string;
  cashierId: string;
  shiftStart: string;
  shiftEnd: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
  expectedMpesa: number;
  expectedCard: number;
  status: 'OPEN' | 'CLOSED';
  managerId?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: { productId: string; quantity: number; costPrice: number }[];
  totalCost: number;
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL';
  createdAt: string;
  receivedAt?: string;
}

export interface StockMovement {
    id: string;
    businessId?: string;
    outletId?: string;
    productId: string;
    type: 'SALE' | 'ADJUSTMENT_UP' | 'ADJUSTMENT_DOWN' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'INITIAL' | 'RECONCILIATION';
    quantity: number;
    reference?: string;
    sourceTerminal?: string;
    timestamp: string;
}
