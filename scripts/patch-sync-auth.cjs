const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../local-server/server/routes/sync.ts');
let code = fs.readFileSync(file, 'utf8');

const target = `// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x-api-key'.toLowerCase()];

  // 1. Check explicit API Key header
  if (apiKey) {
    const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
    if (business) {
      req.user = { businessId: business.id };
      return next();
    }
    const loc = await db.selectFrom('StoreLocation').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
    if (loc) {
      req.user = { businessId: loc.businessId };
      return next();
    }
  }

  // 2. Check Bearer token (could be JWT or API Key)
  if (authHeader) {
    const token = authHeader.includes(' ') ? authHeader.split(' ')[1] : authHeader;

    const businessByToken = await db.selectFrom('Business').selectAll().where('apiKey', '=', token).executeTakeFirst();
    if (businessByToken) {
      req.user = { businessId: businessByToken.id };
      return next();
    }

    const locByToken = await db.selectFrom('StoreLocation').selectAll().where('apiKey', '=', token).executeTakeFirst();
    if (locByToken) {
      req.user = { businessId: locByToken.businessId };
      return next();
    }

    try {
      const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
      req.user = payload;
      return next();
    } catch (err) {}
  }

  // 3. Fallback for single-tenant local server appliance
  const defaultBiz = await db.selectFrom('Business').selectAll().executeTakeFirst();
  if (defaultBiz) {
    req.user = { businessId: defaultBiz.id };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid API Key / Token' });
};`;

const replacement = `// Middleware to authenticate sync requests
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x-api-key'.toLowerCase()];

  // 1. Check explicit API Key header
  if (apiKey) {
    const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', apiKey).executeTakeFirst();
    if (business) {
      req.user = { businessId: business.id };
      return next();
    }
  }

  // 2. Check Bearer token (could be JWT or API Key)
  if (authHeader) {
    const token = authHeader.includes(' ') ? authHeader.split(' ')[1] : authHeader;

    const businessByToken = await db.selectFrom('Business').selectAll().where('apiKey', '=', token).executeTakeFirst();
    if (businessByToken) {
      req.user = { businessId: businessByToken.id };
      return next();
    }

    try {
      const payload = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_secret'));
      req.user = payload;
      return next();
    } catch (err) {}
  }

  // 3. Fallback for single-tenant local server appliance
  const defaultBiz = await db.selectFrom('Business').selectAll().executeTakeFirst();
  if (defaultBiz) {
    req.user = { businessId: defaultBiz.id };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid API Key / Token' });
};`;

const normCode = code.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  fs.writeFileSync(file, normCode.replace(normTarget, normReplacement), 'utf8');
  console.log('SUCCESSFULLY_REMOVED_STORELOCATION_APIKEY_CHECK');
} else {
  console.log('TARGET_NOT_FOUND');
}
