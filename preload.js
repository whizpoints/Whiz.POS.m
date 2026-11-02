const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executed');

/**
 * Exposes protected methods from the Electron main process to the renderer process via the `window.electron` object.
 * This ensures security by checking context isolation and preventing direct access to Node.js APIs in the renderer.
 */
contextBridge.exposeInMainWorld('electron', {
  /**
   * Saves data to a local JSON file.
   * @param {string} fileName - The name of the file to save.
   * @param {any} data - The data to save.
   * @returns {Promise<{success: boolean, error?: any}>}
   */
  saveData: (fileName, data) => ipcRenderer.invoke('save-data', fileName, data),

  /**
   * Reads data from a local JSON file.
   * @param {string} fileName - The name of the file to read.
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  readData: (fileName) => ipcRenderer.invoke('read-data', fileName),

  openExternal: (url) => {
    const { shell } = require('electron');
    return shell.openExternal(url);
  },

  mergeData: (fileName, data) => ipcRenderer.invoke('merge-data', fileName, data),
  applyStockMovements: (movements) => ipcRenderer.invoke('apply-stock-movements', movements),

  addPendingSync: (syncOp) => ipcRenderer.invoke('add-pending-sync', syncOp),
  getPendingSyncs: () => ipcRenderer.invoke('get-pending-syncs'),
  removePendingSyncs: (ids) => ipcRenderer.invoke('remove-pending-syncs', ids),

  /**
   * Prints a transaction receipt.
   * @param {Transaction} transaction - The transaction details.
   * @param {BusinessSetup} businessSetup - The business configuration.
   * @param {boolean} isReprint - Whether this is a reprint.
   */
  printReceipt: (transaction, businessSetup, isReprint) => ipcRenderer.send('print-receipt', transaction, businessSetup, isReprint),

  /**
   * Saves a temporary image file to the persistent application storage.
   * @param {string} tempPath - The path to the temporary image file.
   * @returns {Promise<{success: boolean, path?: string, fileName?: string, error?: any}>}
   */
  saveImage: (tempPath) => ipcRenderer.invoke('save-image', tempPath),

  /**
   * Prints the daily closing report.
   * @param {ClosingReportData} reportData - The aggregated report data.
   * @param {BusinessSetup} businessSetup - The business configuration.
   * @param {boolean} detailed - Whether to print detailed transaction/expense lists.
   */
  printClosingReport: (reportData, businessSetup, detailed) => ipcRenderer.send('print-closing-report', reportData, businessSetup, detailed),

  /**
   * Hospitality Bill Mode: Prints proforma bill for customer.
   */
  printCustomerBill: (bill, businessSetup) => ipcRenderer.send('print-customer-bill', bill, businessSetup),

  /**
   * Hospitality Bill Mode: Prints compact duplicate slip for cashier.
   */
  printCashierSlip: (bill, businessSetup) => ipcRenderer.send('print-cashier-slip', bill, businessSetup),

  /**
   * Hospitality / Daily Closing: Prints consolidated shift audit strip.
   */
  printShiftAuditStrip: (reportData, sales, openBills, businessSetup) => ipcRenderer.send('print-shift-audit-strip', reportData, sales, openBills, businessSetup),

  /**
   * Cashier End-of-Day / Shift Closing Slip.
   */
  printCashierSummary: (cashierName, cashierStats, unpaidBills, businessSetup, selectedDate) => ipcRenderer.send('print-cashier-summary', cashierName, cashierStats, unpaidBills, businessSetup, selectedDate),

  /**
   * Retrieves a list of available system printers.
   * @returns {Promise<any[]>}
   */
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  /**
   * Retrieves the local API configuration (URL, API Key, QR Code).
   * @returns {Promise<{apiKey: string, apiUrl: string, qrCodeDataUrl: string}>}
   */
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),

  /**
   * Discovers the Local Admin Server via mDNS on the network.
   * @returns {Promise<string | null>}
   */
  discoverLocalServer: () => ipcRenderer.invoke('discover-local-server'),
  onServerDiscovered: (callback) => {
    const subscription = (event, data) => callback(event, data);
    ipcRenderer.on('server-discovered', subscription);
    return () => ipcRenderer.removeListener('server-discovered', subscription);
  },

  /**
   * Prints the initial business setup invoice.
   * @param {BusinessSetup} businessSetup - The business configuration.
   * @param {User} adminUser - The admin user details.
   */
  printBusinessSetup: (businessSetup, adminUser) => ipcRenderer.send('print-business-setup', businessSetup, adminUser),

  /**
   * Generates a native PDF from HTML content using Electron's printToPDF and prompts to save it.
   * @param {Object} options - Options containing htmlContent, paperSize, and defaultFileName.
   * @returns {Promise<{success: boolean, filePath?: string, error?: string, canceled?: boolean}>}
   */
  generatePdf: (options) => ipcRenderer.invoke('generate-pdf', options),

  /**
   * Uploads an image to the Back Office server.
   * Uses `node-fetch` within the secure preload context to avoid exposing it to the renderer.
   *
   * @param {string} filePath - The local path of the image to upload.
   * @param {string} apiUrl - The Back Office API URL.
   * @param {string} apiKey - The Back Office API Key.
   * @returns {Promise<{success: boolean, imageUrl: string}>}
   */
  uploadImage: async (filePath, apiUrl, apiKey) => {
    const fetch = require('node-fetch');
    const fs = require('fs');
    const FormData = require('form-data');
    const path = require('path');

    const form = new FormData();
    form.append('image', fs.createReadStream(filePath), {
      filename: path.basename(filePath)
    });

    const response = await fetch(`${apiUrl}/api/upload`, {
      method: 'POST',
      body: form,
      headers: {
        'x-api-key': apiKey,
        ...form.getHeaders()
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Listen for sync updates from the mobile app.
   */
  onMobileDataSync: (callback) => ipcRenderer.on('mobile-data-sync', callback),

  /**
   * Listen for new receipt requests from the mobile app.
   */
  onNewMobileReceipt: (callback) => ipcRenderer.on('new-mobile-receipt', callback),

  /**
   * Saves printer settings.
   */
  savePrinterSettings: (settings) => ipcRenderer.invoke('save-printer-settings', settings),

  /**
   * Gets printer settings.
   */
  getPrinterSettings: () => ipcRenderer.invoke('get-printer-settings'),

  /**
   * Toggles fullscreen mode.
   */
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  /**
   * Checks for application updates.
   */
  checkForUpdate: () => ipcRenderer.send('check-for-update'),

  /**
   * Listen for update available event.
   */
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),

  /**
   * Listen for update downloaded event.
   */
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),

  // --- Developer Tools ---

  getDeveloperConfig: () => ipcRenderer.invoke('get-developer-config'),

  saveDeveloperConfig: (config) => ipcRenderer.invoke('save-developer-config', config),



  backupData: () => ipcRenderer.invoke('backup-data'),

  restoreData: () => ipcRenderer.invoke('restore-data'),
  getBackupSettings: () => ipcRenderer.invoke('get-backup-settings'),
  saveBackupSettings: (settings) => ipcRenderer.invoke('save-backup-settings', settings),

  getConnectedDevices: () => ipcRenderer.invoke('get-connected-devices'),

  getLogs: () => ipcRenderer.invoke('get-logs'),

  checkMpesaPayment: (params) => ipcRenderer.invoke('check-mpesa-payment', params),
  
  sendMpesaStk: (params) => ipcRenderer.invoke('send-mpesa-stk', params),
  
  queryMpesaStk: (params) => ipcRenderer.invoke('query-mpesa-stk', params),

  completeAtomicSale: (saleData, paymentData) => ipcRenderer.invoke('complete-atomic-sale', saleData, paymentData),

  // --- Auth & User Management ---

  auth: {
      login: (userId, pin, deviceId) => ipcRenderer.invoke('auth-login', userId, pin, deviceId),
      logout: (token) => ipcRenderer.invoke('auth-logout', token),
      verify: (token) => ipcRenderer.invoke('auth-verify', token)
  },

  userManagement: {
      addUser: (userData) => ipcRenderer.invoke('user-add', userData),
      updateUser: (userId, updates) => ipcRenderer.invoke('user-update', userId, updates),
      deleteUser: (userId) => ipcRenderer.invoke('user-delete', userId)
  },

  // --- KRA eTIMS Bridge ---
  kraPing: (businessSetup) => ipcRenderer.invoke('kra-ping', businessSetup),
  kraInitDevice: (businessSetup) => ipcRenderer.invoke('kra-init-device', businessSetup),
  kraSyncQueue: (businessSetup) => ipcRenderer.invoke('kra-sync-queue', businessSetup),
  kraSubmitInvoice: (transaction, products, businessSetup) => ipcRenderer.invoke('kra-submit-invoice', transaction, products, businessSetup),
  kraGetStats: () => ipcRenderer.invoke('kra-get-stats'),
  resetAllData: () => ipcRenderer.invoke('reset-all-data')
});
