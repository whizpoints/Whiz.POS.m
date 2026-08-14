const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths to clear
const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const LOCALAPPDATA = process.env.LOCALAPPDATA || APPDATA;

const pathsToWipe = [
    // 1. Main POS Electron Data
    path.join(APPDATA, 'whiz-pos'),
    path.join(LOCALAPPDATA, 'whiz-pos'),
    // 2. Main POS SQLite Data (Windows ProgramData)
    path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'whiz-pos'),
    // 3. Local Server Electron Data
    path.join(APPDATA, 'whiz-local-server'),
    path.join(LOCALAPPDATA, 'whiz-local-server'),
    // 4. Local Server DB
    path.join(__dirname, 'local-server', 'prisma', 'local.db'),
    path.join(__dirname, 'local-server', 'prisma', 'local.db-journal'),
    // 5. Main POS Dev Data
    path.join(__dirname, 'local.db'),
    path.join(__dirname, 'business-setup.json'),
    path.join(__dirname, 'server-config.json'),
    path.join(__dirname, 'daily-summaries.json'),
    path.join(__dirname, 'document-settings.json')
];

console.log('--- Whiz POS Data Wipe ---');

pathsToWipe.forEach(p => {
    if (fs.existsSync(p)) {
        try {
            const stat = fs.lstatSync(p);
            if (stat.isDirectory()) {
                fs.rmSync(p, { recursive: true, force: true });
                console.log(`[DELETED DIR]  ${p}`);
            } else {
                fs.unlinkSync(p);
                console.log(`[DELETED FILE] ${p}`);
            }
        } catch (err) {
            console.error(`[ERROR] Failed to delete ${p}: ${err.message}`);
        }
    } else {
        console.log(`[SKIP] Not found: ${p}`);
    }
});

console.log('\n✅ Wipe Complete! You can now start the applications with a completely clean slate.');
