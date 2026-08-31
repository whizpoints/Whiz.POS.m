
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.BusinessScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  kraPin: 'kraPin',
  logoUrl: 'logoUrl',
  settings: 'settings',
  emailVerified: 'emailVerified',
  setupComplete: 'setupComplete',
  verificationToken: 'verificationToken',
  pairingCode: 'pairingCode',
  apiKey: 'apiKey',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MpesaConfigScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  locationId: 'locationId',
  merchantType: 'merchantType',
  tillNumber: 'tillNumber',
  paybillNumber: 'paybillNumber',
  accountReference: 'accountReference',
  environment: 'environment',
  consumerKey: 'consumerKey',
  consumerSecret: 'consumerSecret',
  passkey: 'passkey',
  shortcode: 'shortcode',
  initiatorName: 'initiatorName',
  initiatorPassword: 'initiatorPassword',
  stkEnabled: 'stkEnabled',
  c2bEnabled: 'c2bEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  outletId: 'outletId'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  locationId: 'locationId',
  email: 'email',
  password: 'password',
  pin: 'pin',
  name: 'name',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  outletId: 'outletId'
};

exports.Prisma.StoreLocationScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OutletScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  locationId: 'locationId',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  productId: 'productId',
  locationId: 'locationId',
  outletId: 'outletId',
  type: 'type',
  quantity: 'quantity',
  reference: 'reference',
  sourceTerminal: 'sourceTerminal',
  timestamp: 'timestamp',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  sku: 'sku',
  barcode: 'barcode',
  name: 'name',
  category: 'category',
  price: 'price',
  costPrice: 'costPrice',
  taxRate: 'taxRate',
  reorderLevel: 'reorderLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductInventoryScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  locationId: 'locationId',
  outletId: 'outletId',
  stock: 'stock',
  reorderLevel: 'reorderLevel',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  phone: 'phone',
  email: 'email',
  loyaltyPoints: 'loyaltyPoints',
  totalSpent: 'totalSpent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MpesaTransactionScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  locationId: 'locationId',
  transactionId: 'transactionId',
  amount: 'amount',
  phoneNumber: 'phoneNumber',
  customerName: 'customerName',
  status: 'status',
  isEnriched: 'isEnriched',
  timestamp: 'timestamp',
  updatedAt: 'updatedAt',
  outletId: 'outletId'
};

exports.Prisma.ReceiptScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  locationId: 'locationId',
  receiptNumber: 'receiptNumber',
  totalAmount: 'totalAmount',
  paymentMethod: 'paymentMethod',
  customerPhone: 'customerPhone',
  mpesaCode: 'mpesaCode',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  cashierName: 'cashierName',
  outletId: 'outletId'
};

exports.Prisma.ReceiptItemScalarFieldEnum = {
  id: 'id',
  receiptId: 'receiptId',
  productName: 'productName',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  contact: 'contact',
  email: 'email',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TerminalScalarFieldEnum = {
  id: 'id',
  macAddress: 'macAddress',
  name: 'name',
  status: 'status',
  apiKey: 'apiKey',
  outletId: 'outletId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SyncLogScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  outletId: 'outletId',
  terminal: 'terminal',
  type: 'type',
  status: 'status',
  details: 'details',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Business: 'Business',
  Category: 'Category',
  MpesaConfig: 'MpesaConfig',
  User: 'User',
  StoreLocation: 'StoreLocation',
  Outlet: 'Outlet',
  StockMovement: 'StockMovement',
  Product: 'Product',
  ProductInventory: 'ProductInventory',
  Customer: 'Customer',
  MpesaTransaction: 'MpesaTransaction',
  Receipt: 'Receipt',
  ReceiptItem: 'ReceiptItem',
  Supplier: 'Supplier',
  Terminal: 'Terminal',
  SyncLog: 'SyncLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
