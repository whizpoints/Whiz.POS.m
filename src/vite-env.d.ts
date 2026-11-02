/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

// some global object injected by platform
declare global {
  interface Window {
    aiSdk?: Record<string, any>;
    ywConfig?: Record<string, any>;
    ywSdk?: Record<string, any>;
    electron: {
      saveData: (fileName: string, data: any) => Promise<{ success: boolean; error?: any }>;
      readData: (fileName: string) => Promise<{ success: boolean; data?: any; error?: any }>;
      openExternal: (url: string) => Promise<void>;
      mergeData: (fileName: string, data: any) => Promise<{ success: boolean; error?: any }>;
      applyStockMovements: (movements: any[]) => Promise<{ success: boolean; error?: any }>;
      addPendingSync: (syncOp: any) => Promise<{ success: boolean }>;
      getPendingSyncs: () => Promise<any[]>;
      removePendingSyncs: (ids: string[]) => Promise<{ success: boolean }>;
      printReceipt: (transaction: any, businessSetup: any, isReprint?: boolean) => void;
      saveImage: (tempPath: string) => Promise<{ success: boolean; path?: string; fileName?: string; error?: any }>;
      printClosingReport: (reportData: any, businessSetup: any, detailed?: boolean) => void;
      printCustomerBill: (bill: any, businessSetup: any) => void;
      printCashierSlip: (bill: any, businessSetup: any) => void;
      printShiftAuditStrip: (reportData: any, sales: any[], openBills: any[], businessSetup: any) => void;
      printCashierSummary?: (cashierName: string, cashierStats: any, unpaidBills: any[], businessSetup: any, selectedDate?: string) => void;
      getApiConfig: () => Promise<{ apiKey: string; apiUrl: string; qrCodeDataUrl: string }>;
      discoverLocalServer: () => Promise<Array<{ name: string; url: string }> | null>;
      onServerDiscovered?: (callback: (event: any, server: { url: string; ip?: string; port?: number; name?: string }) => void) => () => void;
      printBusinessSetup: (businessSetup: any, adminUser: any) => void;
      generatePdf: (options: { htmlContent: string; paperSize?: string; defaultFileName?: string }) => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;
      uploadImage: (filePath: string, apiUrl: string, apiKey: string) => Promise<{ success: boolean; imageUrl: string }>;
      onMobileDataSync: (callback: (event: any, data: any) => void) => void;
      onNewMobileReceipt: (callback: (event: any, data: any) => void) => void;
      getPrinters: () => Promise<any[]>;
      savePrinterSettings: (settings: any) => Promise<{ success: boolean }>;
      getPrinterSettings: () => Promise<any>;
      toggleFullscreen: () => void;
      checkForUpdate: () => void;
      onUpdateAvailable: (callback: (event: any, info: any) => void) => void;
      onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
      getDeveloperConfig: () => Promise<{ developerPin: string | null; mongoUri: string; backOfficeUrl: string; backOfficeApiKey: string }>;
      saveDeveloperConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      backupData: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      restoreData: () => Promise<{ success: boolean; error?: string }>;
      getBackupSettings: () => Promise<{ autoDeleteOldBackups: boolean; backupRetentionDays: number; backupDir: string }>;
      saveBackupSettings: (settings: { autoDeleteOldBackups?: boolean; backupRetentionDays?: number }) => Promise<{ success: boolean; error?: string }>;
      getConnectedDevices: () => Promise<any[]>;
      getLogs: () => Promise<string>;
      checkMpesaPayment: (params: { amount: number }) => Promise<any>;
      sendMpesaStk: (params: any) => Promise<any>;
      queryMpesaStk: (params: any) => Promise<any>;
      completeAtomicSale: (saleData: any, paymentData: any) => Promise<any>;
      kraPing: (businessSetup?: any) => Promise<{ success: boolean; reachable: boolean; latencyMs: number; status?: number; url: string; environment?: string; message?: string; error?: string }>;
      kraInitDevice: (businessSetup?: any) => Promise<{ success: boolean; resultCd?: string; resultMsg?: string; cmcKey?: string | null; data?: any; error?: string }>;
      kraSyncQueue: (businessSetup?: any) => Promise<{ success: boolean; synced: number; pending?: number; total?: number; error?: string }>;
      kraSubmitInvoice: (transaction: any, products: any[], businessSetup?: any) => Promise<any>;
      kraGetStats: () => Promise<{ queuedCount: number; queueDir: string; error?: string }>;
      resetAllData?: () => Promise<{ success: boolean; error?: string }>;
      auth: {
        login: (userId: string, pin: string, deviceId?: string) => Promise<any>;
        logout: (token: string) => Promise<any>;
        verify: (token: string) => Promise<any>;
      };
      userManagement: {
        addUser: (userData: any) => Promise<any>;
        updateUser: (userId: string, updates: any) => Promise<any>;
        deleteUser: (userId: string) => Promise<any>;
      };
    };
  }
}

declare module 'qrcode';

export {};
