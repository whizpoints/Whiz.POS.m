const path = require('path');
const Database = require(path.resolve(__dirname, '../local-server/node_modules/better-sqlite3'));
const { createClient } = require('@libsql/client');

const localDb = new Database(path.resolve(__dirname, '../local-server/db/local.db'));
const turso = createClient({
  url: 'libsql://whizpos-whizposdata.aws-us-east-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NTQyNDYsImlkIjoiMDFhMTZlNzAtYTAwMS03YzZkLTg2NWItN2FiYWU4YTk2Nzg4Iiwia2lkIjoiMkE2THE4RVgzbTk1bTRsRkpZZlhDdFJZUS1RMWJRSjRJanlXTnFkVFZhcyIsInJpZCI6IjViMjA5NTVkLTc3ZWYtNGI3ZC1iOGQzLWY5MTE2OWEwYjkxMSJ9.Sc-CUIX633beg6iv-kb46zChXwEQFP3cjXxzpjdNM9tKyCav205xPhscjYv5m62ETir1wrmHSFT_QSeGYyOVBg'
});

async function syncMpesaToTurso() {
  const configs = localDb.prepare('SELECT * FROM MpesaConfig').all();
  console.log('Found local MpesaConfigs:', configs.length);

  for (const c of configs) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO MpesaConfig (
        id, businessId, locationId, merchantType, tillNumber, paybillNumber, accountReference,
        environment, consumerKey, consumerSecret, passkey, shortcode, initiatorName, initiatorPassword,
        stkEnabled, c2bEnabled, createdAt, updatedAt, outletId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.id, c.businessId, c.locationId, c.merchantType, c.tillNumber, c.paybillNumber, c.accountReference,
        c.environment, c.consumerKey, c.consumerSecret, c.passkey, c.shortcode, c.initiatorName, c.initiatorPassword,
        c.stkEnabled, c.c2bEnabled, c.createdAt, c.updatedAt, c.outletId
      ]
    });
    console.log('Synced MpesaConfig to Turso:', c.id, c.tillNumber);
  }
}

syncMpesaToTurso().catch(console.error);
