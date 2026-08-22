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
        
        -- Relational Products
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY, businessId TEXT, sku TEXT, barcode TEXT, name TEXT, category TEXT, 
            price REAL, costPrice REAL, taxRate REAL, stock INTEGER DEFAULT 0, minStock INTEGER DEFAULT 5, 
            image TEXT, updatedAt TEXT
        );
        
        -- Relational Transactions & Items
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY, businessId TEXT, locationId TEXT, outletId TEXT, receiptNumber TEXT, 
            totalAmount REAL, paymentMethod TEXT, customerPhone TEXT, mpesaCode TEXT, status TEXT, 
            cashierName TEXT, timestamp TEXT, updatedAt TEXT, subtotal REAL, tax REAL
        );
        CREATE TABLE IF NOT EXISTS transaction_items (
            id TEXT PRIMARY KEY, transactionId TEXT, productId TEXT, productName TEXT, 
            quantity INTEGER, unitPrice REAL, totalPrice REAL, 
            FOREIGN KEY(transactionId) REFERENCES transactions(id)
        );
        
        -- Relational Stock Movements
        CREATE TABLE IF NOT EXISTS stockMovements (
            id TEXT PRIMARY KEY, businessId TEXT, productId TEXT, type TEXT, quantity INTEGER, 
            reference TEXT, timestamp TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_stockMovements_productId ON stockMovements(productId);

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
        CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, saleId TEXT, paymentMethod TEXT, amount REAL, reference TEXT, status TEXT, source TEXT, rawCallback TEXT, timestamp TEXT);
        
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

// ... keeping legacy migration for other files ...
async function migrateLegacyData(userDataPath) {
    if (!db) return;
    const files = [
        { file: 'business-setup.json', table: 'businessSetup', isArray: false },
        { file: 'server-config.json', table: 'serverConfig', isArray: false },
        { file: 'users.json', table: 'users', isArray: true },
        { file: 'expenses.json', table: 'expenses', isArray: true },
        { file: 'salaries.json', table: 'salaries', isArray: true },
        { file: 'credit-customers.json', table: 'creditCustomers', isArray: true },
        { file: 'mobile-receipts.json', table: 'mobileReceipts', isArray: true },
        { file: 'credit-payments.json', table: 'creditPayments', isArray: true },
        { file: 'daily-summaries.json', table: 'dailySummaries', isArray: false },
        { file: 'sessions.json', table: 'sessions', isArray: true },
        { file: 'suppliers.json', table: 'suppliers', isArray: true },
        { file: 'document-settings.json', table: 'documentSettings', isArray: false }
    ];

    let migrationOccurred = false;
    const filesToDelete = [];

    try {
        for (const { file, table, isArray } of files) {
            const filePath = path.join(userDataPath, file);
            let content;
            try {
                content = await fs.readFile(filePath, 'utf-8');
            } catch (err) {
                if (err.code === 'ENOENT') continue;
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

        for (const filePath of filesToDelete) {
            try {
                await fs.unlink(filePath);
            } catch (unlinkErr) {}
        }

    } catch (e) {
        console.error(`[Migration Error] Migration failed:`, e);
        throw new Error(`Migration failed: ` + e.message);
    }
}

function getTableData(table) {
    if (!db) return [];
    
    // RELATIONAL OVERRIDES
    if (table === 'products') {
        const stmt = db.prepare('SELECT * FROM products');
        return stmt.all();
    }
    if (table === 'transactions') {
        const stmt = db.prepare('SELECT * FROM transactions');
        const txns = stmt.all();
        const itemsStmt = db.prepare('SELECT * FROM transaction_items WHERE transactionId = ?');
        return txns.map(tx => {
            const items = itemsStmt.all(tx.id).map(item => ({
                quantity: item.quantity,
                product: {
                    id: item.productId,
                    name: item.productName,
                    price: item.unitPrice
                }
            }));
            return { 
                ...tx, 
                total: tx.totalAmount, 
                cashier: tx.cashierName,
                items 
            };
        });
    }
    if (table === 'stockMovements' || table === 'inventoryLogs') {
        const stmt = db.prepare('SELECT sm.*, p.name as productName FROM stockMovements sm LEFT JOIN products p ON sm.productId = p.id ORDER BY sm.timestamp DESC');
        return stmt.all().map(sm => ({
            id: sm.id,
            productId: sm.productId,
            productName: sm.productName || 'Unknown Product',
            variance: (sm.type === 'subtract' || sm.type === 'SALE' || sm.type === 'OUT' || sm.type === 'out' || sm.type === 'ADJUSTMENT_DOWN') ? -Math.abs(sm.quantity) : Math.abs(sm.quantity),
            type: sm.type,
            reason: sm.type,
            timestamp: sm.timestamp,
            reference: sm.reference,
            oldStock: 0,
            newStock: 0,
            cashierName: ''
        }));
    }

    try {
        const isSingleton = ['businessSetup', 'serverConfig', 'dailySummaries', 'documentSettings', 'sync_metadata'].includes(table);
        const query = isSingleton 
            ? `SELECT data FROM ${table} ORDER BY rowid DESC LIMIT 1`
            : `SELECT data FROM ${table}`;
        
        const stmt = db.prepare(query);
        const rows = stmt.all();
        
        if (isSingleton) {
            return rows.length > 0 ? JSON.parse(rows[0].data) : (table === 'dailySummaries' ? {} : null);
        }
        return rows.map(r => JSON.parse(r.data));
    } catch (e) {
        console.error(`[DB Error] Failed to read ${table}:`, e);
        return ['businessSetup', 'serverConfig', 'dailySummaries', 'documentSettings', 'sync_metadata'].includes(table) ? (table === 'dailySummaries' ? {} : null) : [];
    }
}

function saveProductCatalog(id, dataObj) {
    const existing = db.prepare('SELECT stock FROM products WHERE id = ?').get(String(id));
    const preservedStock = existing ? existing.stock : (dataObj.stock || 0);
    
    const stmt = db.prepare(`INSERT OR REPLACE INTO products 
        (id, businessId, sku, barcode, name, category, price, costPrice, taxRate, stock, minStock, image, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
        String(dataObj.id), dataObj.businessId || '', dataObj.sku || '', dataObj.barcode || '',
        dataObj.name || '', dataObj.category || '', dataObj.price || 0, dataObj.costPrice || 0,
        dataObj.taxRate || 0, preservedStock, dataObj.minStock || 0, dataObj.image || '',
        dataObj.updatedAt || new Date().toISOString()
    );
}

function saveTableData(table, id, dataObj) {
    if (!db) return;
    
    // RELATIONAL OVERRIDES
    if (table === 'products') {
        const stmt = db.prepare(`INSERT OR REPLACE INTO products 
            (id, businessId, sku, barcode, name, category, price, costPrice, taxRate, stock, minStock, image, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
            String(dataObj.id), dataObj.businessId || '', dataObj.sku || '', dataObj.barcode || '', 
            dataObj.name || '', dataObj.category || '', dataObj.price || 0, dataObj.costPrice || 0, 
            dataObj.taxRate || 0, dataObj.stock || 0, dataObj.minStock || 0, dataObj.image || '', 
            dataObj.updatedAt || new Date().toISOString()
        );
        return;
    }

    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
        stmt.run(String(id), JSON.stringify(dataObj));
    } catch (e) {}
}

function applyStockMovement(movement) {
    const exists = db.prepare('SELECT id FROM stockMovements WHERE id = ?').get(String(movement.id));
    if (exists) return false;
    
    db.prepare(`INSERT INTO stockMovements (id, businessId, productId, type, quantity, reference, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(movement.id, movement.businessId || '', String(movement.productId), 
             movement.type, movement.quantity, movement.reference || '', 
             movement.timestamp || new Date().toISOString());
    
    const delta = ['SALE', 'ADJUSTMENT_DOWN', 'TRANSFER_OUT'].includes(movement.type) 
        ? -Math.abs(movement.quantity) 
        : Math.abs(movement.quantity);
    
    db.prepare('UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?')
        .run(delta, String(movement.productId));
    
    return true;
}

function applyStockMovements(movements) {
    if (!movements || !Array.isArray(movements) || movements.length === 0) return 0;
    let applied = 0;
    db.transaction(() => {
        for (const m of movements) {
            if (applyStockMovement(m)) applied++;
        }
    })();
    return applied;
}

function completeAtomicSale(tx, items) {
    if (!db) throw new Error("DB not init");
    
    const insertTx = db.prepare(`INSERT INTO transactions 
        (id, businessId, locationId, outletId, receiptNumber, totalAmount, paymentMethod, customerPhone, mpesaCode, status, cashierName, timestamp, updatedAt, subtotal, tax) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
    const insertItem = db.prepare(`INSERT INTO transaction_items 
        (id, transactionId, productId, productName, quantity, unitPrice, totalPrice) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
    const updateStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`);
    
    const insertStockMovement = db.prepare(`INSERT INTO stockMovements 
        (id, businessId, productId, type, quantity, reference, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);

    db.transaction(() => {
        insertTx.run(
            tx.id, tx.businessId || '', tx.locationId || '', tx.outletId || '', tx.receiptNumber || tx.id, 
            tx.totalAmount || tx.total || 0, tx.paymentMethod || 'cash', tx.customerPhone || '', tx.mpesaCode || '', 
            tx.status || 'completed', tx.cashierName || tx.cashier || '', tx.timestamp || new Date().toISOString(), 
            tx.updatedAt || new Date().toISOString(), tx.subtotal || 0, tx.tax || 0
        );

        for (const item of items) {
            const itemId = 'ITEM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const productId = item.productId || item.product?.id || '';
            const productName = item.productName || item.product?.name || '';
            const qty = item.quantity || 1;
            const price = item.unitPrice || item.product?.price || 0;
            const total = item.totalPrice || (qty * price);

            insertItem.run(itemId, tx.id, String(productId), productName, qty, price, total);
            
            if (productId) {
                updateStock.run(qty, String(productId));
                const moveId = 'MOV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                insertStockMovement.run(moveId, tx.businessId || '', String(productId), 'SALE', qty, tx.id, new Date().toISOString());
            }
        }
    })();
    return tx.id;
}

function saveSingletonData(table, dataObj) {
    if (!db) return;
    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
        stmt.run('SINGLETON', JSON.stringify(dataObj));
    } catch (e) {}
}

function deleteTableData(table, id) {
    if (!db) return;
    
    if (table === 'products') {
        const stmt = db.prepare(`DELETE FROM products WHERE id = ?`);
        stmt.run(String(id));
        return;
    }
    if (table === 'transactions') {
        const stmt = db.prepare(`DELETE FROM transactions WHERE id = ?`);
        stmt.run(String(id));
        const stmt2 = db.prepare(`DELETE FROM transaction_items WHERE transactionId = ?`);
        stmt2.run(String(id));
        return;
    }

    try {
        const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        stmt.run(String(id));
    } catch (e) {}
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
        'inventory-logs.json': { table: 'stockMovements', isArray: true },
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
        if (mapInfo.table === 'products') {
             const existingIds = db.prepare('SELECT id FROM products').all().map(r => r.id);
             const incomingIds = new Set();
             db.transaction(() => {
                 for (const item of data) {
                     const id = item.id || item.productId;
                     if (id) {
                         incomingIds.add(String(id));
                         saveTableData('products', id, item);
                     }
                 }
                 for (const id of existingIds) {
                     if (!incomingIds.has(id)) deleteTableData('products', id);
                 }
             })();
             return;
        }
        if (mapInfo.table === 'transactions') {
             const existingIds = db.prepare('SELECT id FROM transactions').all().map(r => r.id);
             const incomingIds = new Set();
             db.transaction(() => {
                 for (const item of data) {
                     const id = item.id || item.transactionId;
                     if (id) {
                         incomingIds.add(String(id));
                         const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(String(id));
                         if (!existing) {
                             completeAtomicSale(item, item.items || []);
                         }
                     }
                 }
             })();
             return;
        }
        if (mapInfo.table === 'stockMovements' || mapInfo.table === 'inventoryLogs') {
             const incomingIds = new Set();
             db.transaction(() => {
                 for (const item of data) {
                     const id = item.id;
                     if (id) {
                         incomingIds.add(String(id));
                         const existing = db.prepare('SELECT id FROM stockMovements WHERE id = ?').get(String(id));
                         if (!existing) {
                             const insertStockMovement = db.prepare(`INSERT INTO stockMovements 
                                 (id, businessId, productId, type, quantity, reference, timestamp) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`);
                             
                             let type = item.type || item.reason || '';
                             let qty = item.quantity;
                             if (qty === undefined && item.variance !== undefined) {
                                qty = Math.abs(item.variance);
                                if (item.variance < 0 && type === '') type = 'subtract';
                                if (item.variance > 0 && type === '') type = 'add';
                             }
                             
                             insertStockMovement.run(
                                 item.id, item.businessId || '', item.productId || '', type,
                                 qty || 0, item.reference || '', item.timestamp || new Date().toISOString()
                             );
                         }
                     }
                 }
             })();
             return;
        }
        
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

            const existingIdsStmt = db.prepare(`SELECT id FROM ${mapInfo.table}`);
            const existingIds = existingIdsStmt.all().map(row => row.id);

            for (const id of existingIds) {
                if (!incomingIds.has(id)) deleteStmt.run(id);
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
        
        if (mapInfo.table === 'products') {
            db.transaction(() => {
                const incomingIds = new Set();
                for (const item of data) {
                    const id = item.id || item.productId;
                    if (id) {
                        incomingIds.add(String(id));
                        saveProductCatalog(id, item);
                    }
                }
            })();
            return;
        }

        if (mapInfo.table === 'stockMovements' || mapInfo.table === 'inventoryLogs') {
             db.transaction(() => {
                 for (const item of data) {
                     const id = item.id;
                     if (id) {
                         const existing = db.prepare('SELECT id FROM stockMovements WHERE id = ?').get(String(id));
                         if (!existing) {
                             const insertStockMovement = db.prepare(`INSERT INTO stockMovements 
                                 (id, businessId, productId, type, quantity, reference, timestamp) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`);
                             
                             let type = item.type || item.reason || '';
                             let qty = item.quantity;
                             if (qty === undefined && item.variance !== undefined) {
                                qty = Math.abs(item.variance);
                                if (item.variance < 0 && type === '') type = 'subtract';
                                if (item.variance > 0 && type === '') type = 'add';
                             }
                             
                             insertStockMovement.run(
                                 item.id, item.businessId || '', item.productId || '', type,
                                 qty || 0, item.reference || '', item.timestamp || new Date().toISOString()
                             );
                         }
                     }
                 }
             })();
             return;
        }

        const selectStmt = db.prepare(`SELECT data FROM ${mapInfo.table} WHERE id = ?`);
        const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${mapInfo.table} (id, data) VALUES (?, ?)`);
        
        db.transaction(() => {
            for (const item of data) {
                const id = item.id || item.productId || item.userId || item.expenseId || item.transactionId || item.customerId || item.supplierId || item.token;
                if (id) {
                    let finalItem = item;
                    const existingRow = selectStmt.get(String(id));
                    if (existingRow && existingRow.data) {
                        try {
                            const existingData = JSON.parse(existingRow.data);
                            finalItem = { ...existingData, ...item };
                        } catch (e) {}
                    }
                    insertStmt.run(String(id), JSON.stringify(finalItem));
                }
            }
        })();
    } else {
        if (data) {
            const existing = getTableData(mapInfo.table) || {};
            saveSingletonData(mapInfo.table, { ...existing, ...data });
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
    } catch (e) {}
}

function getPendingSyncs() {
    if (!db) return [];
    try {
        const stmt = db.prepare(`SELECT * FROM pending_syncs ORDER BY timestamp ASC`);
        return stmt.all().map(r => ({
            id: r.id, type: r.type, data: JSON.parse(r.data), timestamp: r.timestamp
        }));
    } catch (e) {
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
    } catch (e) {}
}

module.exports = {
    initDB, migrateLegacyData, getTableData, saveTableData, saveSingletonData, deleteTableData,
    readJsonFileFallback, writeJsonFileFallback, mergeJsonFileFallback, completeAtomicSale,
    saveProductCatalog, applyStockMovement, applyStockMovements,
    addPendingSync, getPendingSyncs, removePendingSyncs, get db() { return db; },
    backupDB: async (destPath) => { await db.backup(destPath); },
    closeDB: () => { if (db) { db.close(); db = null; } }
};
