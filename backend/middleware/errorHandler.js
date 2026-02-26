// middleware/errorHandler.js
const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  // Log error
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue?.[field];
    return res.status(409).json({
      success: false,
      message: `${field} '${value}' is already taken`,
      type: "error",
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", ") || "Validation failed",
      type: "error",
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: '${err.value}'`,
      type: "error",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token", type: "error" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired", type: "error" });
  }

  // Operational errors (our custom AppError subclasses)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      type: "error",
    });
  }

  // Unexpected / programming errors
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    type: "error",
  });
};