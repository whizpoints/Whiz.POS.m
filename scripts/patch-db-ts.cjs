const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../local-server/server/db.ts');
let code = fs.readFileSync(file, 'utf8');

const target = `let dbPath = path.join(__dirname, '../db/local.db');
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
  dbPath = process.env.DATABASE_URL.replace('file:', '');
}`;

const replacement = `let dbPath = path.join(__dirname, '../db/local.db');
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
  const custom = process.env.DATABASE_URL.replace('file:', '');
  dbPath = path.isAbsolute(custom) ? custom : path.resolve(path.join(__dirname, '..'), custom);
}`;

const normCode = code.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  fs.writeFileSync(file, normCode.replace(normTarget, normReplacement), 'utf8');
  console.log('SUCCESSFULLY_PATCHED_DB_TS');
} else {
  console.log('TARGET_NOT_FOUND_IN_DB_TS');
}
