const rateLimit = require('express-rate-limit');

/**
 * globalLimiter — Applied to all routes.
 * 100 requests per 15 minutes per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

/**
 * voteLimiter — Applied specifically to voting endpoints.
 * Stricter: 10 votes per 15 minutes per IP to prevent bot flooding.
 */
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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
