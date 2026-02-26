// utils/error.utils.js

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

class InsufficientFundsError extends AppError {
  constructor(message = "Insufficient funds") {
    super(message, 422);
    this.name = "InsufficientFundsError";
  }
}

class MarketClosedError extends AppError {
  constructor(message = "Market is not open for trading") {
    super(message, 422);
    this.name = "MarketClosedError";
  }
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
  MarketClosedError,
  RateLimitError,
};