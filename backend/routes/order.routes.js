// routes/order.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/order.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { placeOrderSchema } = require("../validators/market.validator");
const { orderLimiter } = require("../middleware/rateLimiter.middleware");

router.use(authenticateToken);

router.get("/", controller.getMyOrders);
router.get("/market/:marketId", controller.getMarketOrders);
router.get("/:orderId", controller.getOrder);
router.post("/", orderLimiter, validate(placeOrderSchema), controller.placeOrder);
router.delete("/:orderId", controller.cancelOrder);

module.exports = router;