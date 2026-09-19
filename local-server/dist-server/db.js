import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let dbPath = path.join(__dirname, '../db/local.db');
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
    dbPath = process.env.DATABASE_URL.replace('file:', '');
}
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const sqliteDb = new Database(dbPath);
try {
    const tableCheck = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Business'").get();
    if (!tableCheck) {
        let sqlPath = path.join(__dirname, '../db/schema.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf8');
            sqliteDb.exec(sql);
            console.log('Database initialized automatically with schema.sql');
            const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            for (const table of tables) {
                if (table.name === 'sqlite_sequence' || table.name.startsWith('_'))
                    continue;
                const columns = sqliteDb.prepare(`PRAGMA table_info("${table.name}")`).all();
                if (columns.some(c => c.name === 'updatedAt')) {
                    sqliteDb.exec(`
              CREATE TRIGGER IF NOT EXISTS update_${table.name}_updatedAt
              AFTER UPDATE ON "${table.name}"
              FOR EACH ROW
              BEGIN
                  UPDATE "${table.name}" SET updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
              END;
          `);
                }
            }
        }
    }
}
catch (err) {
    console.error('Failed to initialize database schema:', err);
}
const dialect = new SqliteDialect({
    database: sqliteDb,
});
const db = new Kysely({
    dialect,
});
export default db;
