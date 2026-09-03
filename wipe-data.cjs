const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI Escape Codes for Colors
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m"
};

const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const LOCALAPPDATA = process.env.LOCALAPPDATA || APPDATA;

// Definition of paths
const posPaths = [
    // 1. Main POS Electron Data
    path.join(APPDATA, 'whiz-pos'),
    path.join(LOCALAPPDATA, 'whiz-pos'),
    // 2. Main POS SQLite Data (Windows ProgramData)
    path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'whiz-pos'),
    // 3. Main POS Dev Data
    path.join(__dirname, 'local.db'),
    path.join(__dirname, 'local.db-journal'),
    path.join(__dirname, 'business-setup.json'),
    path.join(__dirname, 'server-config.json'),
    path.join(__dirname, 'daily-summaries.json'),
    path.join(__dirname, 'document-settings.json')
];

const serverPaths = [
    // 1. Local Server Electron Data
    path.join(APPDATA, 'whiz-local-server'),
    path.join(LOCALAPPDATA, 'whiz-local-server'),
    path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'whizpos-server'),
    // 2. Local Server DB
    path.join(__dirname, 'local-server', 'db', 'local.db'),
    path.join(__dirname, 'local-server', 'db', 'local.db-journal'),
    path.join(__dirname, 'local-server', 'local.db'),
    path.join(__dirname, 'local-server', 'local.db-journal'),
    path.join(__dirname, 'local-server', 'prisma', 'local.db'),
    path.join(__dirname, 'local-server', 'prisma', 'local.db-journal'),
    // 3. Webportal DB
    path.join(__dirname, 'webportal', 'prisma', 'local.db'),
    path.join(__dirname, 'webportal', 'prisma', 'local.db-journal'),
];

// Reusable wipe function
function wipePaths(paths, title) {
    console.log(`\n${colors.cyan}--- Wiping ${title} ---${colors.reset}`);
    let deletedCount = 0;
    
    paths.forEach(p => {
        if (fs.existsSync(p)) {
            try {
                const stat = fs.lstatSync(p);
                if (stat.isDirectory()) {
                    fs.rmSync(p, { recursive: true, force: true });
                    console.log(`${colors.red}[DELETED DIR]${colors.reset}  ${p}`);
                } else {
                    fs.unlinkSync(p);
                    console.log(`${colors.red}[DELETED FILE]${colors.reset} ${p}`);
                }
                deletedCount++;
            } catch (err) {
                console.error(`${colors.yellow}[ERROR] Failed to delete ${p}: ${err.message}${colors.reset}`);
            }
        } else {
            console.log(`${colors.bright}[SKIP] Not found:${colors.reset} ${p}`);
        }
    });

    console.log(`\n${colors.green}✅ ${title} Wipe Complete! (${deletedCount} items deleted)${colors.reset}`);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function displayMenu() {
    console.clear();
    console.log(`\n${colors.bright}${colors.magenta}=========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}         WHIZ POS RESET UTILITY          ${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}=========================================${colors.reset}\n`);
    
    console.log(`${colors.yellow}Please select what you would like to reset:${colors.reset}\n`);
    console.log(`  ${colors.bright}${colors.blue}[1]${colors.reset} Reset Point of Sale (Terminal only)`);
    console.log(`  ${colors.bright}${colors.blue}[2]${colors.reset} Reset Local Server (Server only)`);
    console.log(`  ${colors.bright}${colors.red}[3]${colors.reset} Reset Entire System (POS + Server)`);
    console.log(`  ${colors.bright}${colors.green}[4]${colors.reset} Cancel / Exit\n`);
}

function promptChoice() {
    rl.question(`${colors.bright}Enter your choice (1-4): ${colors.reset}`, (answer) => {
        const choice = answer.trim();
        
        switch(choice) {
            case '1':
                wipePaths(posPaths, "Point of Sale");
                rl.close();
                break;
            case '2':
                wipePaths(serverPaths, "Local Server");
                rl.close();
                break;
            case '3':
                rl.question(`\n${colors.bright}${colors.red}WARNING: This will wipe EVERYTHING. Are you sure? (y/n): ${colors.reset}`, (confirm) => {
                    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                        wipePaths([...posPaths, ...serverPaths], "Entire System");
                    } else {
                        console.log(`\n${colors.green}Reset aborted.${colors.reset}`);
                    }
                    rl.close();
                });
                break;
            case '4':
                console.log(`\n${colors.green}Exiting...${colors.reset}`);
                rl.close();
                break;
            default:
                console.log(`\n${colors.red}Invalid choice. Please enter a number between 1 and 4.${colors.reset}`);
                setTimeout(() => {
                    displayMenu();
                    promptChoice();
                }, 1000);
                break;
        }
    });
}

displayMenu();
promptChoice();
