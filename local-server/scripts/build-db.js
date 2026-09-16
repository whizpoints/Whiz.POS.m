const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/template.db');
const sqlPath = path.join(__dirname, '../prisma/schema.sql');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);
const sql = fs.readFileSync(sqlPath, 'utf8');

db.exec(sql);
db.close();

console.log('Successfully generated template.db from schema.sql');
