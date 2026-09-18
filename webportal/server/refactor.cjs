const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.ts') && !file.replace(/\\/g, '/').endsWith('webportal/server/db.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('webportal/server');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('new PrismaClient()')) {
        content = content.replace(/import\s+\{\s*PrismaClient\s*\}\s+from\s+['"]@prisma\/client['"];?\r?\n?/g, '');
        content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?\r?\n?/g, '');
        
        // Figure out relative path to db.ts
        const parts = file.split(path.sep);
        const serverIndex = parts.indexOf('server');
        const depth = parts.length - serverIndex - 2; // depth relative to server dir
        const prefix = depth === 0 ? './' : '../'.repeat(depth);
        const importStmt = "import prisma from '" + prefix + "db.js';\n";
        
        // Insert at top
        content = importStmt + content;
        
        fs.writeFileSync(file, content);
        console.log('Refactored:', file);
    }
});
