import jwt from 'jsonwebtoken';
import db from '../db.js';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
let cachedBizId = null;
let cachedBizTimestamp = 0;
export function invalidateBusinessCache() {
    cachedBizId = null;
    cachedBizTimestamp = 0;
}
export async function getLocalBusinessId() {
    const now = Date.now();
    if (cachedBizId && (now - cachedBizTimestamp < 5000)) {
        return cachedBizId;
    }
    try {
        const biz = await db.selectFrom('Business').select('id').executeTakeFirst();
        if (biz) {
            cachedBizId = biz.id;
            cachedBizTimestamp = now;
            return biz.id;
        }
    }
    catch (e) { }
    return 'default';
}
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : (req.headers['x-api-key'] || req.query.token);
    if (!token) {
        return res.status(401).json({ error: 'Missing authorization header or token' });
    }
    const localId = await getLocalBusinessId();
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        // Single-Tenant Local Server Guarantee:
        // Always align businessId to the local database business
        if (localId && req.user.businessId !== localId) {
            req.user.outdatedBusinessId = req.user.businessId;
            req.user.businessId = localId;
        }
        return next();
    }
    catch (err) {
        // If token verification failed (e.g. expired or signed with previous secret),
        // allow decoded token on local edge server
        try {
            const decoded = jwt.decode(token);
            if (decoded && typeof decoded === 'object') {
                req.user = {
                    ...decoded,
                    businessId: localId,
                    role: decoded.role || 'ADMIN'
                };
                req.user.outdatedBusinessId = decoded.businessId;
                return next();
            }
        }
        catch (decodeErr) { }
        // Fallback: Verify as API Key (Desktop POS / Local appliances)
        try {
            const business = await db.selectFrom('Business').selectAll().where('apiKey', '=', token).executeTakeFirst();
            if (business) {
                req.user = { businessId: business.id, role: 'ADMIN', name: business.name };
                return next();
            }
        }
        catch (dbErr) { }
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
