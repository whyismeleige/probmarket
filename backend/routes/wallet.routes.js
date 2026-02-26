// routes/wallet.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);
router.get("/", controller.getWallet);
router.get("/transactions", controller.getTransactions);

module.exports = router;