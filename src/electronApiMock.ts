// src/electronApiMock.ts

/**
 * Mocks the Electron `window.electron` API for browser-based testing (Playwright).
 * This allows the Zustand store to "load" data from the public folder by fetching it,
 * mimicking the behavior of the Electron main process reading files from disk.
 */
export const setupElectronMock = () => {
  if (process.env.NODE_ENV === 'development' && !window.electron) {
    console.log('Setting up mock Electron API for browser environment.');

    window.electron = {
      saveData: async (fileName, data) => {
        console.log(`[Mock] saveData(${fileName}):`, data);
        return { success: true };
      },
      readData: async (fileName) => {
        try {
          const response = await fetch(`/data/${fileName}`);
          if (!response.ok) {
            // Mock file not found by returning undefined data, which store handles
            console.log(`[Mock] Data file not found: ${fileName}, returning empty.`);
            return { success: true, data: undefined };
          }
          const data = await response.json();
          console.log(`[Mock] readData(${fileName}):`, data);
          return { success: true, data };
        } catch (error) {
          console.error(`[Mock] Error reading data ${fileName}:`, error);
          return { success: true, data: undefined };
        }
      },
      printReceipt: (transaction, businessSetup, isReprint) => {
        console.log('[Mock] printReceipt:', { transaction, businessSetup, isReprint });
      },
      saveImage: async (tempPath) => {
        console.log('[Mock] saveImage:', tempPath);
        return { success: true, path: `mock/path/to/${tempPath}`, fileName: tempPath };
      },
      printClosingReport: (reportData, businessSetup) => {
        console.log('[Mock] printClosingReport:', { reportData, businessSetup });
      },
      printBusinessSetup: (businessSetup, adminUser) => {
        console.log('[Mock] printBusinessSetup:', { businessSetup, adminUser });
      },
      getApiConfig: async () => {
        console.log('[Mock] getApiConfig');
        return {
          apiUrl: 'http://localhost:3001/api',
          apiKey: 'mock-api-key',
          qrCodeDataUrl: 'mock-qr-code-data-url',
        };
      },
      uploadImage: async (filePath, apiUrl, apiKey) => {
        console.log('[Mock] uploadImage:', { filePath, apiUrl, apiKey });
        return { success: true, imageUrl: 'https://via.placeholder.com/150' };
      },
      onMobileDataSync: (callback) => {
         console.log('[Mock] onMobileDataSync listener registered');
      },
      onNewMobileReceipt: (callback) => {
         console.log('[Mock] onNewMobileReceipt listener registered');
      },
      getPrinters: async () => {
         console.log('[Mock] getPrinters');
         return [
             { name: 'Mock Printer 1', isDefault: true },
             { name: 'Mock Printer 2', isDefault: false }
         ];
      },
      savePrinterSettings: async (settings) => {
         console.log('[Mock] savePrinterSettings:', settings);
         return { success: true };
      },
      getPrinterSettings: async () => {
         console.log('[Mock] getPrinterSettings');
         return { defaultPrinter: 'Mock Printer 1' };
      },
      toggleFullscreen: () => {
         console.log('[Mock] toggleFullscreen');
      },
      checkForUpdate: () => {
         console.log('[Mock] checkForUpdate');
      },
      onUpdateAvailable: (callback) => {
         console.log('[Mock] onUpdateAvailable listener registered');
      },
      onUpdateDownloaded: (callback) => {
         console.log('[Mock] onUpdateDownloaded listener registered');
      },
      getDeveloperConfig: async () => {
          console.log('[Mock] getDeveloperConfig');
          return { developerPin: null, mongoUri: '', backOfficeUrl: '', backOfficeApiKey: '' };
      },
      saveDeveloperConfig: async (config) => {
          console.log('[Mock] saveDeveloperConfig:', config);
          return { success: true };
      }
    };
  }
};
