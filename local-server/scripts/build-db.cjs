const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db/template.db');
const sqlPath = path.join(__dirname, '../db/schema.sql');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

try {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(sql);
  db.close();
  console.log('Successfully generated template.db from schema.sql using node:sqlite');
} catch (e) {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  db.exec(sql);
  db.close();
  console.log('Successfully generated template.db from schema.sql using better-sqlite3');
}

// Ensure backup-crypto.cjs is copied to dist-server
const cryptoSrc = path.join(__dirname, '../server/backup-crypto.cjs');
const distServer = path.join(__dirname, '../dist-server');
const distRoutes = path.join(distServer, 'routes');
if (fs.existsSync(cryptoSrc)) {
  if (!fs.existsSync(distServer)) fs.mkdirSync(distServer, { recursive: true });
  if (!fs.existsSync(distRoutes)) fs.mkdirSync(distRoutes, { recursive: true });
  fs.copyFileSync(cryptoSrc, path.join(distServer, 'backup-crypto.cjs'));
  fs.copyFileSync(cryptoSrc, path.join(distRoutes, 'backup-crypto.cjs'));
  console.log('Copied backup-crypto.cjs to dist-server');
}
