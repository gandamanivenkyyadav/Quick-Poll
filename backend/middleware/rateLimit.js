const rateLimit = require('express-rate-limit');

/**
 * globalLimiter — Applied to all routes.
 * 500 requests per 15 minutes per IP (lenient for shared networks/proxies).
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

/**
 * voteLimiter — Applied specifically to voting endpoints.
 * Keys by unique voter ID (from browser localStorage) when available,
 * falls back to IP. Higher limit to allow many users on shared networks.
 */
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // increased to allow many users on shared networks/proxies
  standardHeaders: true,
  legacyHeaders: false,
  // Use voter ID from header if available, otherwise fall back to IP
  keyGenerator: (req) => {
    return req.headers['x-voter-id'] || req.ip || req.connection.remoteAddress || 'unknown';
  },
  message: { success: false, error: 'Too many voting requests. Slow down!' }
});

/**
 * authLimiter — Applied to login/register endpoints.
 * 10 attempts per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts. Try again in 15 minutes.' }
});

module.exports = { globalLimiter, voteLimiter, authLimiter };
