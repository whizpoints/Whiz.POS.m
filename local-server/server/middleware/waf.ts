import { Request, Response, NextFunction } from 'express';

interface IpData {
  failedLogins: number;
  wafViolations: number;
  blockedUntil: number;
}

const ipRecords = new Map<string, IpData>();

const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const getIpData = (ip: string): IpData => {
  if (!ipRecords.has(ip)) {
    ipRecords.set(ip, { failedLogins: 0, wafViolations: 0, blockedUntil: 0 });
  }
  return ipRecords.get(ip)!;
};

export const wafMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const data = getIpData(ip);

  // Check if blocked
  if (data.blockedUntil > Date.now()) {
    return res.status(403).json({ error: 'Too many requests or violations. IP blocked temporarily.' });
  }

  // Deep inspect for malicious payloads, but skip if the request provides an authorization token
  // (assume authenticated requests are from the app itself, preventing false positives on legitimate app data)
  if (!req.headers.authorization) {
    const maliciousPatterns = [/<script>/i, /javascript:/i, /onerror=/i, /UNION\s+SELECT/i];
    
    const inspectPayload = (payload: any): boolean => {
      if (!payload) return false;
      if (typeof payload === 'string') {
        return maliciousPatterns.some(pattern => pattern.test(payload));
      }
      if (typeof payload === 'object') {
        for (const key in payload) {
          if (inspectPayload(payload[key])) return true;
        }
      }
      return false;
    };

    const isMalicious = inspectPayload(req.body) || inspectPayload(req.query) || inspectPayload(req.headers);

    if (isMalicious) {
      data.wafViolations += 1;
      if (data.wafViolations >= 5) {
        data.blockedUntil = Date.now() + BLOCK_DURATION_MS;
        data.wafViolations = 0; // reset counter after blocking
      }
      return res.status(403).json({ error: 'Malicious payload detected.' });
    }
  }

  // Intercept response to track failed logins
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    res.on('finish', () => {
      if (res.statusCode === 401) {
        data.failedLogins += 1;
        if (data.failedLogins >= 5) {
          data.blockedUntil = Date.now() + BLOCK_DURATION_MS;
          data.failedLogins = 0;
        }
      } else if (res.statusCode === 200) {
        data.failedLogins = 0; // reset on successful login
      }
    });
  }

  next();
};
