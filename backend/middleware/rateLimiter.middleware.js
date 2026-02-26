// middleware/rateLimiter.middleware.js
const rateLimit = require("express-rate-limit");

// ─── General API rate limiter ─────────────────────────────────────────────────
exports.generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200"),
  message: { success: false, message: "Too many requests, please try again later.", type: "error" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path === "/metrics",
});

// ─── Auth rate limiter (stricter) ────────────────────────────────────────────
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many auth attempts, please try again later.", type: "error" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Order placement rate limiter ─────────────────────────────────────────────
exports.orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.ORDER_RATE_LIMIT_MAX || "60"),
  message: { success: false, message: "Order rate limit exceeded.", type: "error" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});