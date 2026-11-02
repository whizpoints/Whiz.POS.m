const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../local-server/electron/main.ts');
let code = fs.readFileSync(file, 'utf8');

const target = "['./node_modules/tsx/dist/cli.mjs', 'server/index.ts']";
const replacement = "['./node_modules/tsx/dist/cli.mjs', 'watch', 'server/index.ts']";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log('SUCCESSFULLY_PATCHED_MAIN_TS');
} else {
  console.log('TARGET_NOT_FOUND_IN_MAIN_TS');
}
