const fs = require('fs');

let pos = fs.readFileSync('src/store/posStore.ts', 'utf8');

pos = pos.replace(
  'if (state.businessSetup?.kraEnabled && state.isOnline) {',
  'const isKraActive = state.businessSetup?.kraEnabled || !!state.businessSetup?.kraPin || !!(state.businessSetup as any)?.etimsPin;\n        if (isKraActive && state.isOnline) {'
);

pos = pos.replace(
  'const backendUrl = state.businessSetup?.backOfficeUrl || state.businessSetup?.apiUrl;',
  'const backendUrl = state.businessSetup?.backOfficeUrl || state.businessSetup?.apiUrl || "http://localhost:5050";'
);

pos = pos.replace(
  'let newBusinessSetup = { ...(currentState.businessSetup || {}) };\n          if (serverData.businessSetup) {',
  'let newBusinessSetup = { ...(currentState.businessSetup || {}) };\n          if (serverData.businessSetup) {\n            const resolvedBizId = serverData.businessSetup.businessId || serverData.businessSetup.id || currentState.businessSetup?.businessId || currentState.businessSetup?.id;'
);

pos = pos.replace(
  "deviceRole: currentState.businessSetup?.deviceRole || 'TerminalMode',",
  "deviceRole: currentState.businessSetup?.deviceRole || 'TerminalMode',\n              businessId: resolvedBizId,\n              id: resolvedBizId,"
);

fs.writeFileSync('src/store/posStore.ts', pos, 'utf8');
console.log('posStore.ts updated successfully');
