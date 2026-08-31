const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('prisma/local.db'); 
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='SyncLog';", (err, rows) => { 
  if (err) console.error(err);
  console.log(rows); 
});
