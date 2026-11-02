const path = require('path');
const Database = require(path.resolve(__dirname, '../local-server/node_modules/better-sqlite3'));
const db = new Database(path.resolve(__dirname, '../local-server/db/local.db'));

db.prepare("UPDATE User SET role = 'ADMIN', pin = '1234' WHERE email = 'admin'").run();
db.prepare("UPDATE User SET role = 'ADMIN', pin = '0000' WHERE email = 'admin@whizpos.local'").run();
db.prepare("UPDATE User SET role = 'MANAGER', pin = '5678' WHERE email = 'manager@whizpos.local'").run();
db.prepare("UPDATE User SET role = 'MANAGER', pin = '4321' WHERE email = 'supervisor@whizpos.local'").run();
db.prepare("UPDATE User SET pin = '1111' WHERE email = 'cashier1@whizpos.local'").run();
db.prepare("UPDATE User SET pin = '2222' WHERE email = 'cashier2@whizpos.local'").run();
db.prepare("UPDATE User SET pin = '8888' WHERE email = 'cashier_1792754082551@whizpos.local'").run();
db.prepare("UPDATE User SET pin = '1234' WHERE pin IS NULL").run();

console.log('Updated users:');
console.log(db.prepare("SELECT id, name, email, role, pin, outletId FROM User").all());
