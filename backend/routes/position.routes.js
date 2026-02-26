// routes/position.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/position.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);
router.get("/", controller.getMyPositions);
router.get("/history", controller.getTradeHistory);
router.get("/:marketId", controller.getMarketPosition);

module.exports = router;