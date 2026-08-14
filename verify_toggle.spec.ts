import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Verify M-Pesa automation toggle in developer page', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Use playwright to mock electron APIs since the app expects it
  await page.addInitScript(() => {
    window.electron = {
      ipcRenderer: {
        send: () => {},
        on: () => {},
        removeListener: () => {},
      },
      readData: async (filename) => {
        if (filename === 'business-setup.json') {
          return {
            isSetupComplete: true,
            isLoggedIn: false,
            businessName: "Test Business",
            mpesaConfig: { enabled: false }
          };
        }
        if (filename === 'users.json') {
          return [{ id: '1', name: 'Admin', pin: '1234', role: 'admin', isActive: true }];
        }
        return { data: [] }; // Return valid object with data to prevent destructuring error
      },
      writeData: async () => true,
      checkUpdate: async () => {},
      onUpdateAvailable: () => {},
      onUpdateDownloaded: () => {},
      onUpdateError: () => {},
      getAppVersion: async () => '1.0.0',
      onMobileDataSync: () => {}, // mock missing function
      onNewMobileReceipt: () => {}, // mock missing function
      onMobileExpenseSync: () => {},
    };

    // Set localStorage to bypass any setup wizards
    window.localStorage.setItem('pos-storage', JSON.stringify({
      state: {
        isSetupWizardOpen: false,
        hasSeenUpdateModal: true,
        businessSetup: {
           isSetupComplete: true,
           isLoggedIn: false,
           businessName: "Test Business",
           mpesaConfig: { enabled: false }
        }
      },
      version: 0
    }));
  });

  // Load the app
  await page.goto('http://localhost:5173');

  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/home/jules/verification/debug_screen7.png' });

  // Find the button containing the Shield icon (it's absolute positioned for developer access)
  const devButton = page.locator('button[title="Developer Mode"]');
  if (await devButton.count() > 0) {
    await devButton.click();
  } else {
    // try finding by shield class
    const shieldBtn = page.locator('.lucide-shield').last();
    if (await shieldBtn.count() > 0) {
      await shieldBtn.click();
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/debug_screen8.png' });

  // Enter developer PIN (7 digits: 1234567)
  const pinDigits = ['1', '2', '3', '4', '5', '6', '7'];
  for (const digit of pinDigits) {
    const btn = page.locator(`button:visible:has-text("${digit}")`).first();
    if (await btn.count() > 0) {
        await btn.click();
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/debug_screen9.png' });

  // Click on the Backend & M-Pesa tab
  const tab = page.locator('text=Backend & M-Pesa');
  if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(500);
  }

  // Take screenshot
  await page.screenshot({ path: '/home/jules/verification/mpesa_toggle.png' });

  // Also take one after toggling it on
  const toggle = page.locator('text=Enable M-Pesa Automation');
  if (await toggle.count() > 0) {
      await toggle.click();
      await page.waitForTimeout(500); // Wait for animation
  }

  await page.screenshot({ path: '/home/jules/verification/mpesa_toggle_enabled.png' });
});