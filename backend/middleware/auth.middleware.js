// middleware/auth.middleware.js
const { verifyToken } = require("../utils/auth.utils");
const { AuthenticationError, ForbiddenError } = require("../utils/error.utils");
const db = require("../models");

/**
 * Verifies JWT from httpOnly cookie and loads user directly from MongoDB.
 */
exports.authenticateToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AuthenticationError("No token provided. Please login."));
  }

  try {
    const { id } = verifyToken(token);

    // Fetch user straight from MongoDB
    const user = await db.user.findById(id).select("-password -security");

    if (!user) {
      return next(new AuthenticationError("User not found."));
    }

    if (!user.isActive) {
      return next(new AuthenticationError("Account is deactivated."));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control.
 * Usage: authorizeRoles("admin", "moderator")
 */
exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ForbiddenError("You do not have permission to perform this action."));
  }
  next();
};