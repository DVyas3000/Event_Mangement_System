// middleware/securityMiddleware.js
// In-memory stores (swap for Redis in production)

const failedAttempts = new Map();  // ip -> { count, firstAttempt, lastAttempt }
const blockedIPs     = new Map();  // ip -> { blockedAt, reason, permanent }
const securityEvents = [];         // newest-first ring buffer

const MAX_FAILED = 5;
const BLOCK_MS   = 15 * 60 * 1000;  // 15-min auto-block
const WINDOW_MS  = 10 * 60 * 1000;  // 10-min sliding window
const MAX_EVENTS = 500;

const getIP = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

function logEvent(type, ip, detail = '') {
  securityEvents.unshift({ type, ip, detail, ts: new Date().toISOString() });
  if (securityEvents.length > MAX_EVENTS) securityEvents.length = MAX_EVENTS;
}

function isBlocked(ip) {
  const e = blockedIPs.get(ip);
  if (!e) return false;
  if (e.permanent) return true;
  if (Date.now() - e.blockedAt < BLOCK_MS) return true;
  blockedIPs.delete(ip); failedAttempts.delete(ip);
  return false;
}

// Admin-facing reads
exports.getSecurityEvents = () => [...securityEvents];
exports.getBlockedIPs = () =>
  [...blockedIPs.entries()].map(([ip, d]) => ({
    ip, reason: d.reason, permanent: d.permanent,
    blockedAt: new Date(d.blockedAt).toISOString(),
    expiresAt: d.permanent ? null : new Date(d.blockedAt + BLOCK_MS).toISOString()
  }));
exports.manualBlock = (ip, reason = 'Manual block by admin') => {
  blockedIPs.set(ip, { blockedAt: Date.now(), reason, permanent: true });
  logEvent('MANUAL_BLOCK', ip, reason);
};
exports.unblockIP = (ip) => {
  blockedIPs.delete(ip); failedAttempts.delete(ip);
  logEvent('UNBLOCK', ip, 'Unblocked by admin');
};

// Middleware: reject blocked IPs
exports.checkBlocked = (req, res, next) => {
  const ip = getIP(req);
  req.clientIP = ip;
  if (isBlocked(ip)) {
    logEvent('BLOCKED_REQUEST', ip, req.path);
    return res.status(429).json({
      success: false,
      message: 'Your IP is temporarily blocked due to repeated failed attempts. Try again later.'
    });
  }
  next();
};

// Middleware: track failed attempts and auto-block
exports.trackFailedAttempt = (req, res, next) => {
  const ip = req.clientIP || getIP(req);
  const origJson = res.json.bind(res);

  res.json = (body) => {
    const isFail = res.statusCode === 401 ||
      (res.statusCode === 400 && body?.message?.toLowerCase().includes('captcha'));

    if (isFail) {
      const now = Date.now();
      const e   = failedAttempts.get(ip) || { count: 0, firstAttempt: now, lastAttempt: now };
      if (now - e.firstAttempt > WINDOW_MS) { e.count = 0; e.firstAttempt = now; }
      e.count++; e.lastAttempt = now;
      failedAttempts.set(ip, e);
      logEvent('FAILED_ATTEMPT', ip, `${req.path} (${e.count}/${MAX_FAILED})`);
      if (e.count >= MAX_FAILED && !isBlocked(ip)) {
        blockedIPs.set(ip, { blockedAt: now, reason: `${e.count} failed attempts`, permanent: false });
        logEvent('AUTO_BLOCK', ip, `Auto-blocked after ${e.count} failures`);
      }
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      failedAttempts.delete(ip);
      logEvent('SUCCESS', ip, req.path);
    }
    return origJson(body);
  };
  next();
};

// Middleware: sliding-window rate limiter
const reqWindows = new Map();
exports.rateLimiter = (maxReq = 15, windowMs = 60_000) => (req, res, next) => {
  const ip  = req.clientIP || getIP(req);
  const now = Date.now();
  const ts  = (reqWindows.get(ip) || []).filter(t => now - t < windowMs);
  ts.push(now); reqWindows.set(ip, ts);
  if (ts.length > maxReq) {
    logEvent('RATE_LIMITED', ip, req.path);
    return res.status(429).json({ success: false, message: 'Too many requests. Please wait before retrying.' });
  }
  next();
};
