import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../prisma/local.db');
const dialect = new SqliteDialect({
    database: new Database(dbPath),
});
const db = new Kysely({
    dialect,
});
export default db;
