const rateLimit = require('express-rate-limit');

const createRateLimiter = (options) => rateLimit({
  windowMs: options.windowMs || 15 * 60 * 1000,
  max: options.max || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: options.message || { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

exports.authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

exports.sensitiveAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset attempts, please try again later.' }
});

exports.itemCreateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many item creation requests, please try again later.' }
});

exports.itemSearchLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 120,
  message: { error: 'Too many item search requests, please try again later.' }
});

exports.contactLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many contact requests, please try again later.' }
});

exports.messageLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many chat messages, please try again later.' }
});
