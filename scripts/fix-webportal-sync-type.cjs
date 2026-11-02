const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../webportal/server/routes/sync.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("let bSettings = {};", "let bSettings: any = {};");

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed webportal/server/routes/sync.ts bSettings typing');
