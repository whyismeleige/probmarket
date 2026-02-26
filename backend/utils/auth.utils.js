// utils/auth.utils.js
const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("./error.utils");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";

/**
 * Creates a signed JWT
 */
const createToken = (payload) => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/**
 * Verifies and decodes a JWT
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AuthenticationError("Token has expired. Please login again.");
    }
    throw new AuthenticationError("Invalid token.");
  }
};

/**
 * Returns a sanitized user object (no password, no security fields)
 */
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.security;
  delete obj.__v;
  return obj;
};

/**
 * Returns cookie options based on environment
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

/**
 * Extracts request metadata (IP, user agent)
 */
const getMetaData = (req) => ({
  ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
  userAgent: req.headers["user-agent"],
  lastLoginAt: new Date(),
});

module.exports = { createToken, verifyToken, sanitizeUser, getCookieOptions, getMetaData };