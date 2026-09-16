import Database from 'better-sqlite3';
const conn = new Database('local.db');
console.log('Tables:', conn.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
console.log('Business Count:', conn.prepare('SELECT count(*) as c FROM Business').get());
console.log('Terminal Count:', conn.prepare('SELECT count(*) as c FROM Terminal').get());
