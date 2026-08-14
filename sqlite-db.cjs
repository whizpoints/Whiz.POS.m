const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs/promises');

let db;

function initDB(userDataPath) {
    const dbPath = path.join(userDataPath, 'whizpos.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS businessSetup (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS serverConfig (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS salaries (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS creditCustomers (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS loyaltyCustomers (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS mobileReceipts (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS creditPayments (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS dailySummaries (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS heldOrders (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS stockMovements (id TEXT PRIMARY KEY, data TEXT);
        
        -- Multi-Outlet Additions
        CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS outlets (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS terminals (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS sync_metadata (id TEXT PRIMARY KEY, data TEXT);
        
        -- Relational Tables
        CREATE TABLE IF NOT EXISTS outlet_stock (id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0, updated_at TEXT);
        
        -- Sync Queue
        CREATE TABLE IF NOT EXISTS pending_syncs (id TEXT PRIMARY KEY, type TEXT, data TEXT, timestamp TEXT);
    `);

    return dbPath;
}

async function migrateLegacyData(userDataPath) {
    if (!db) return;

    const files = [
        { file: 'business-setup.json', table: 'businessSetup', isArray: false },
        { file: 'server-config.json', table: 'serverConfig', isArray: false },
        { file: 'users.json', table: 'users', isArray: true },
        { file: 'products.json', table: 'products', isArray: true },
        { file: 'transactions.json', table: 'transactions', isArray: true },
        { file: 'expenses.json', table: 'expenses', isArray: true },
        { file: 'salaries.json', table: 'salaries', isArray: true },
        { file: 'credit-customers.json', table: 'creditCustomers', isArray: true },
        { file: 'mobile-receipts.json', table: 'mobileReceipts', isArray: true },
        { file: 'credit-payments.json', table: 'creditPayments', isArray: true },
        { file: 'inventory-logs.json', table: 'inventoryLogs', isArray: true },
        { file: 'daily-summaries.json', table: 'dailySummaries', isArray: false },
        { file: 'sessions.json', table: 'sessions', isArray: true },
        { file: 'suppliers.json', table: 'suppliers', isArray: true },
        { file: 'documents.json', table: 'documents', isArray: true },
        { file: 'document-settings.json', table: 'documentSettings', isArray: false }
    ];

    let migrationOccurred = false;
    const filesToDelete = [];

    try {
        // Start a single transaction for the entire migration to guarantee atomicity if possible,
        // but since we're inserting into multiple tables, we'll just process sequentially.
        // If an error happens, we throw and DO NOT delete any files.
        for (const { file, table, isArray } of files) {
            const filePath = path.join(userDataPath, file);
            let content;
            try {
                content = await fs.readFile(filePath, 'utf-8');
            } catch (err) {
                if (err.code === 'ENOENT') continue; // File doesn't exist, skip
                throw err;
            }

            if (!content || content.trim() === '') continue;

            const data = JSON.parse(content);

            const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    const id = item.id || item.productId || item.userId || item.expenseId || item.transactionId || item.customerId || item.supplierId || item.token || `MIGRATE_${Date.now()}_${Math.random()}`;
                    stmt.run(String(id), JSON.stringify(item));
                }
            });

            if (isArray && Array.isArray(data)) {
                insertMany(data);
            } else if (!isArray && typeof data === 'object') {
                if (Object.keys(data).length > 0) {
                    stmt.run('SINGLETON', JSON.stringify(data));
                }
            }

            migrationOccurred = true;
            filesToDelete.push(filePath);
            console.log(`[Migration] Successfully processed ${file}`);
        }

        // Only after ALL files have been successfully migrated do we delete them.
        for (const filePath of filesToDelete) {
            try {
                await fs.unlink(filePath);
                console.log(`[Migration] Deleted legacy file ${path.basename(filePath)}`);
            } catch (unlinkErr) {
                console.warn(`[Migration] Could not delete legacy file ${path.basename(filePath)}:`, unlinkErr.message);
            }
        }

        if (migrationOccurred) {
            console.log('[Migration] Legacy JSON to SQLite migration completed successfully.');
        }

    } catch (e) {
        console.error(`[Migration Error] Migration failed:`, e);
        // Do not delete any JSON files. The app will halt because we re-throw the error.
        throw new Error(`Migration failed: ` + e.message);
    }
}

function getTableData(table) {
    if (!db) return [];
    try {
        const stmt = db.prepare(`SELECT data FROM ${table}`);
        const rows = stmt.all();
        if (['businessSetup', 'serverConfig', 'dailySummaries', 'documentSettings'].includes(table)) {
            return rows.length > 0 ? JSON.parse(rows[0].data) : (table === 'dailySummaries' ? {} : null);
        }
        return rows.map(r => JSON.parse(r.data));
    } catch (e) {
        console.error(`[DB Error] Failed to read ${table}:`, e);
        return ['businessSetup', 'serverConfig', 'dailySummaries', 'documentSettings'].includes(table) ? (table === 'dailySummaries' ? {} : null) : [];
    }
}

function saveTableData(table, id, dataObj) {
    if (!db) return;
    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
        stmt.run(String(id), JSON.stringify(dataObj));
    } catch (e) {
        console.error(`[DB Error] Failed to save to ${table}:`, e);
        throw e;
    }
}

function saveSingletonData(table, dataObj) {
    if (!db) return;
    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
        stmt.run('SINGLETON', JSON.stringify(dataObj));
    } catch (e) {
        console.error(`[DB Error] Failed to save to ${table}:`, e);
        throw e;
    }
}

function deleteTableData(table, id) {
    if (!db) return;
    try {
        const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        stmt.run(String(id));
    } catch (e) {
        console.error(`[DB Error] Failed to delete from ${table}:`, e);
        throw e;
    }
}

function getFileTableMapping(filename) {
    const map = {
        'business-setup.json': { table: 'businessSetup', isArray: false },
        'server-config.json': { table: 'serverConfig', isArray: false },
        'users.json': { table: 'users', isArray: true },
        'products.json': { table: 'products', isArray: true },
        'transactions.json': { table: 'transactions', isArray: true },
        'expenses.json': { table: 'expenses', isArray: true },
        'salaries.json': { table: 'salaries', isArray: true },
        'credit-customers.json': { table: 'creditCustomers', isArray: true },
        'loyalty-customers.json': { table: 'loyaltyCustomers', isArray: true },
        'mobile-receipts.json': { table: 'mobileReceipts', isArray: true },
        'credit-payments.json': { table: 'creditPayments', isArray: true },
        'daily-summaries.json': { table: 'dailySummaries', isArray: false },
        'sessions.json': { table: 'sessions', isArray: true },
        'suppliers.json': { table: 'suppliers', isArray: true },
        'audit-logs.json': { table: 'audit_logs', isArray: true },
        'held-orders.json': { table: 'heldOrders', isArray: true },
        'stock-movements.json': { table: 'stockMovements', isArray: true },
        
        // Multi-Outlet Additions
        'categories.json': { table: 'categories', isArray: true },
        'outlets.json': { table: 'outlets', isArray: true },
        'terminals.json': { table: 'terminals', isArray: true },
        'sync-metadata.json': { table: 'sync_metadata', isArray: false }
    };
    return map[filename];
}

async function readJsonFileFallback(filename) {
    const mapInfo = getFileTableMapping(filename);
    if (mapInfo) {
        return getTableData(mapInfo.table);
    }
    return [];
}

async function writeJsonFileFallback(filename, data) {
    const mapInfo = getFileTableMapping(filename);
    if (!mapInfo) return;

    if (mapInfo.isArray) {
        const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${mapInfo.table} (id, data) VALUES (?, ?)`);

        const deleteStmt = db.prepare(`DELETE FROM ${mapInfo.table} WHERE id = ?`);
        db.transaction(() => {
            const incomingIds = new Set();
            for (const item of data) {
                const id = item.id || item.productId || item.userId || item.expenseId || item.transactionId || item.customerId || item.supplierId || item.token;
                if (id) {
                    incomingIds.add(String(id));
                    insertStmt.run(String(id), JSON.stringify(item));
                }
            }

            // Fetch existing IDs to find ones to delete
            const existingIdsStmt = db.prepare(`SELECT id FROM ${mapInfo.table}`);
            const existingIds = existingIdsStmt.all().map(row => row.id);

            for (const id of existingIds) {
                if (!incomingIds.has(id)) {
                    deleteStmt.run(id);
                }
            }
        })();
    } else {
        saveSingletonData(mapInfo.table, data);
    }
}

async function mergeJsonFileFallback(filename, data) {
    const mapInfo = getFileTableMapping(filename);
    if (!mapInfo) return;

    if (mapInfo.isArray) {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        
        const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${mapInfo.table} (id, data) VALUES (?, ?)`);
        
        db.transaction(() => {
            for (const item of data) {
                const id = item.id || item.productId || item.userId || item.expenseId || item.transactionId || item.customerId || item.supplierId || item.token;
                if (id) {
                    insertStmt.run(String(id), JSON.stringify(item));
                }
            }
        })();
    } else {
        if (data) {
            saveSingletonData(mapInfo.table, data);
        }
    }
}

function addPendingSync(syncOperation) {
    if (!db) return;
    try {
        const id = 'SYNC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const stmt = db.prepare(`INSERT INTO pending_syncs (id, type, data, timestamp) VALUES (?, ?, ?, ?)`);
        stmt.run(id, syncOperation.type, JSON.stringify(syncOperation.data), new Date().toISOString());
        return id;
    } catch (e) {
        console.error('[DB Error] Failed to add pending sync:', e);
        throw e;
    }
}

function getPendingSyncs() {
    if (!db) return [];
    try {
        const stmt = db.prepare(`SELECT * FROM pending_syncs ORDER BY timestamp ASC`);
        const rows = stmt.all();
        return rows.map(r => ({
            id: r.id,
            type: r.type,
            data: JSON.parse(r.data),
            timestamp: r.timestamp
        }));
    } catch (e) {
        console.error('[DB Error] Failed to get pending syncs:', e);
        return [];
    }
}

function removePendingSyncs(ids) {
    if (!db || !ids || ids.length === 0) return;
    try {
        const stmt = db.prepare(`DELETE FROM pending_syncs WHERE id = ?`);
        const deleteMany = db.transaction((idsToDelete) => {
            for (const id of idsToDelete) {
                stmt.run(id);
            }
        });
        deleteMany(ids);
    } catch (e) {
        console.error('[DB Error] Failed to remove pending syncs:', e);
        throw e;
    }
}

module.exports = {
    initDB,
    migrateLegacyData,
    getTableData,
    saveTableData,
    saveSingletonData,
    deleteTableData,
    readJsonFileFallback,
    writeJsonFileFallback,
    mergeJsonFileFallback,
    addPendingSync,
    getPendingSyncs,
    removePendingSyncs,
    get db() { return db; },
    backupDB: async (destPath) => {
        if (!db) throw new Error("Database not initialized");
        await db.backup(destPath);
    },
    closeDB: () => {
        if (db) {
            db.close();
            db = null;
        }
    }
};