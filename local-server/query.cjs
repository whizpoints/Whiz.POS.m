const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/local.db');
db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) throw err;
    console.log('Tables:', rows.map(r => r.name));
    
    db.all("SELECT * FROM Business", [], (err, businesses) => {
        console.log('Businesses:', businesses);
    });

    db.all("SELECT * FROM Product", [], (err, products) => {
        console.log('Products:', products.length);
    });
  });
});
