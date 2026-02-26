// middleware/validate.middleware.js
const { ValidationError } = require("../utils/error.utils");

/**
 * Validates req.body against a Zod schema.
 * Throws ValidationError with formatted messages on failure.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return next(new ValidationError(message));
  }
  req.body = result.data; // Use coerced/transformed data
  next();
};

/**
 * Validates req.query against a Zod schema.
 */
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return next(new ValidationError(message));
  }
  req.query = result.data;
  next();
};

module.exports = { validate, validateQuery };