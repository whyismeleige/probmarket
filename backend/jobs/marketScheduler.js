// jobs/marketScheduler.js
// Runs periodic tasks: auto-close expired markets, clean up order books

const cron = require("node-cron");
const db = require("../models");
const orderBookService = require("../services/orderBook.service");
const { MARKET_STATUSES } = require("../config/constants");
const logger = require("../utils/logger");

const initScheduledJobs = () => {
  // ── Every 5 minutes: suspend markets that have passed their closesAt ──────
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const expiredMarkets = await db.market.find({
        status: MARKET_STATUSES.OPEN,
        closesAt: { $lte: now },
      });

      if (expiredMarkets.length > 0) {
        logger.info(`⏰ Suspending ${expiredMarkets.length} expired markets`);
        await db.market.updateMany(
          { _id: { $in: expiredMarkets.map((m) => m._id) } },
          { status: MARKET_STATUSES.SUSPENDED }
        );

        // Cancel all open orders in expired markets
        for (const market of expiredMarkets) {
          const openOrders = await db.order.find({
            marketId: market._id,
            status: { $in: [MARKET_STATUSES.OPEN, "PARTIALLY_FILLED"] },
          });

          for (const order of openOrders) {
            if (order.side === "BUY" && order.reservedCents > 0) {
              const remainingFraction = order.remainingQuantity / order.quantity;
              const toRelease = Math.round(remainingFraction * order.reservedCents);
              const wallet = await db.wallet.findOne({ userId: order.userId });
              if (wallet && toRelease > 0) {
                await wallet.releaseFunds(toRelease, order._id.toString());
              }
            }
          }

          await db.order.updateMany(
            {
              marketId: market._id,
              status: { $in: ["OPEN", "PARTIALLY_FILLED"] },
            },
            { status: "CANCELLED", closedAt: new Date() }
          );

          // Remove from order book
          await orderBookService.removeMarket(market._id);
        }
      }
    } catch (err) {
      logger.error("Market expiry scheduler error:", err.message);
    }
  });

  // ── Every day at midnight: log stats ───────────────────────────────────────
  cron.schedule("0 0 * * *", async () => {
    try {
      const [totalOpen, totalResolved, totalVolume] = await Promise.all([
        db.market.countDocuments({ status: MARKET_STATUSES.OPEN }),
        db.market.countDocuments({ status: MARKET_STATUSES.RESOLVED }),
        db.trade.aggregate([{ $group: { _id: null, total: { $sum: "$totalValueCents" } } }]),
      ]);

      logger.info(`📊 Daily stats: ${totalOpen} open markets, ${totalResolved} resolved, ${totalVolume[0]?.total || 0}¢ total volume`);
    } catch (err) {
      logger.error("Daily stats scheduler error:", err.message);
    }
  });

  logger.info("✅ Scheduled jobs initialized");
};

module.exports = initScheduledJobs;