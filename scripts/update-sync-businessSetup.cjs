const fs = require('fs');

let sync = fs.readFileSync('local-server/server/routes/sync.ts', 'utf8');

const targetStr = `      businessSetup: business ? {
        id: business.id,
        businessName: business.name,
        kraPin: business.kraPin,
        apiKey: business.apiKey,`;

const replacementStr = `      businessSetup: business ? (() => {
        let bSettings = {};
        try { bSettings = typeof business.settings === 'string' ? JSON.parse(business.settings) : (business.settings || {}); } catch(e) {}
        const effectivePin = business.kraPin || bSettings.kraPin || bSettings.etimsPin || '';
        return {
          id: business.id,
          businessId: business.id,
          businessName: business.name,
          kraPin: effectivePin,
          kraEnabled: true,
          etimsPin: effectivePin,
          etimsUrl: bSettings.etimsUrl || 'https://etims-api-sbx.kra.go.ke/etims-api',
          apiKey: business.apiKey,`;

sync = sync.replace(targetStr, replacementStr);

const endTarget = `        createdAt: business.createdAt || new Date().toISOString()
      } : {}`;

const endReplacement = `        createdAt: business.createdAt || new Date().toISOString()
        };
      })() : {}`;

sync = sync.replace(endTarget, endReplacement);

fs.writeFileSync('local-server/server/routes/sync.ts', sync, 'utf8');
console.log('local-server sync.ts updated successfully');

// Also update webportal/server/routes/sync.ts
let webSync = fs.readFileSync('webportal/server/routes/sync.ts', 'utf8');
if (webSync.includes('businessSetup: business ? {')) {
  webSync = webSync.replace(targetStr, replacementStr);
  webSync = webSync.replace(endTarget, endReplacement);
  fs.writeFileSync('webportal/server/routes/sync.ts', webSync, 'utf8');
  console.log('webportal sync.ts updated successfully');
}
