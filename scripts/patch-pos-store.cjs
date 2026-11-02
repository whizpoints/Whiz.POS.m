const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/store/posStore.ts');
let code = fs.readFileSync(file, 'utf8');

const target = `'Authorization': \`Bearer \${apiKey}\``;
const replacement = `'Authorization': \`Bearer \${apiKey}\`,\n                  'x-api-key': apiKey`;

const index = code.indexOf(target);
if (index !== -1) {
  code = code.slice(0, index) + replacement + code.slice(index + target.length);
  fs.writeFileSync(file, code, 'utf8');
  console.log('SUCCESSFULLY_PATCHED_POS_STORE');
} else {
  console.log('TARGET_NOT_FOUND_IN_POS_STORE');
}
