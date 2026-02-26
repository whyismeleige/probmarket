// controllers/wallet.controller.js
const asyncHandler = require("../middleware/asyncHandler");
const db = require("../models");
const { NotFoundError } = require("../utils/error.utils");

/**
 * @route   GET /api/wallet
 * @desc    Get current user's wallet
 * @access  Private
 */
exports.getWallet = asyncHandler(async (req, res) => {
  const wallet = await db.wallet.findOne({ userId: req.user._id });
  if (!wallet) throw new NotFoundError("Wallet not found");

  return res.status(200).json({
    success: true,
    data: {
      wallet: {
        availableBalanceCents: wallet.availableBalanceCents,
        reservedBalanceCents: wallet.reservedBalanceCents,
        totalBalanceCents: wallet.totalBalanceCents,
        // Convert to dollars for display
        availableBalance: (wallet.availableBalanceCents / 100).toFixed(2),
        reservedBalance: (wallet.reservedBalanceCents / 100).toFixed(2),
        totalBalance: (wallet.totalBalanceCents / 100).toFixed(2),
      },
    },
  });
});

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 */
exports.getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type } = req.query;
  const wallet = await db.wallet.findOne({ userId: req.user._id });
  if (!wallet) throw new NotFoundError("Wallet not found");

  let txs = wallet.transactions.slice().reverse(); // Most recent first
  if (type) txs = txs.filter((t) => t.type === type);

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paged = txs.slice(skip, skip + parseInt(limit));

  return res.status(200).json({
    success: true,
    data: {
      transactions: paged,
      pagination: { page: parseInt(page), total: txs.length },
    },
  });
});