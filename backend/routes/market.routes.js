// routes/market.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/market.controller");
const { authenticateToken, authorizeRoles } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createMarketSchema, updateMarketSchema, resolveMarketSchema } = require("../validators/market.validator");

// ─── Public routes ───────────────────────────────────────────────────────────
router.get("/", controller.listMarkets);
router.get("/categories", controller.getCategories);
router.get("/:id", authenticateToken, controller.getMarket); // Auth optional - if logged in, attach user data
router.get("/:id/history", controller.getMarketHistory);
router.get("/:id/orderbook", controller.getOrderBook);
router.get("/:id/trades", controller.getMarketTrades);

// ─── Admin-only routes ───────────────────────────────────────────────────────
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "moderator"),
  validate(createMarketSchema),
  controller.createMarket
);

router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "moderator"),
  validate(updateMarketSchema),
  controller.updateMarket
);

router.post(
  "/:id/resolve",
  authenticateToken,
  authorizeRoles("admin", "moderator"),
  validate(resolveMarketSchema),
  controller.resolveMarket
);

router.post(
  "/:id/cancel",
  authenticateToken,
  authorizeRoles("admin"),
  controller.cancelMarket
);

module.exports = router;