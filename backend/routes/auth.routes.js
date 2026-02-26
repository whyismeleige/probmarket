// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { loginSchema, registerSchema } = require("../validators/auth.validator");
const { authLimiter } = require("../middleware/rateLimiter.middleware");

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.get("/profile", authenticateToken, controller.getProfile);
router.post("/logout", authenticateToken, controller.logout);

module.exports = router;