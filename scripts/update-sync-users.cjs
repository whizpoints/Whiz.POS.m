const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../local-server/server/routes/sync.ts');
let content = fs.readFileSync(file, 'utf8');

const oldUserFilter = `      // Only return cashiers assigned to this outlet, PLUS Admins/Managers
      finalUsers = allUsers.filter(u => 
        u.outletId === targetOutletId || 
        u.role === 'ADMIN' || 
        u.role === 'MANAGER'
      );`;

const newUserFilter = `      // Return cashiers assigned to this outlet + Admins/Managers + unassigned cashiers if none assigned yet
      const outletCashiers = allUsers.filter(u => u.outletId === targetOutletId);
      finalUsers = allUsers.filter(u => 
        u.outletId === targetOutletId || 
        u.role?.toUpperCase() === 'ADMIN' || 
        u.role?.toUpperCase() === 'MANAGER' ||
        (outletCashiers.length === 0 && !u.outletId)
      );`;

function replaceFlexible(str, oldPart, newPart) {
  const isCRLF = str.includes('\r\n');
  const normOld = oldPart.replace(/\r?\n/g, isCRLF ? '\r\n' : '\n');
  const normNew = newPart.replace(/\r?\n/g, isCRLF ? '\r\n' : '\n');
  return str.replace(normOld, normNew);
}

content = replaceFlexible(content, oldUserFilter, newUserFilter);

// Also ensure pin fallback
content = replaceFlexible(content, "pin: u.pin || null,", "pin: u.pin || '1234',");

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated user filter in local-server/server/routes/sync.ts');
