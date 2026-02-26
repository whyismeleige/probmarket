// models/Wallet.model.js
// All monetary values are stored in CENTS (integer) to avoid floating point issues
// $100.00 = 10000 cents

const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "ORDER_RESERVE", "ORDER_RELEASE", "TRADE_CREDIT", "TRADE_DEBIT", "SETTLEMENT_CREDIT"],
      required: true,
    },
    amountCents: { type: Number, required: true }, // Can be negative for debits
    balanceAfterCents: { type: Number, required: true },
    referenceId: { type: String }, // orderId, tradeId, etc.
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Available balance (not locked in open orders)
    availableBalanceCents: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Available balance cannot be negative"],
    },
    // Balance locked in open orders (reserved)
    reservedBalanceCents: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Reserved balance cannot be negative"],
    },
    // Transaction history (last 1000)
    transactions: {
      type: [TransactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
WalletSchema.virtual("totalBalanceCents").get(function () {
  return this.availableBalanceCents + this.reservedBalanceCents;
});

// ─── Methods ──────────────────────────────────────────────────────────────────

/**
 * Reserve funds for an open order.
 * Moves money from available → reserved.
 */
WalletSchema.methods.reserveFunds = async function (amountCents, referenceId, session) {
  if (this.availableBalanceCents < amountCents) {
    throw new Error(`Insufficient funds. Available: ${this.availableBalanceCents}¢, Required: ${amountCents}¢`);
  }
  this.availableBalanceCents -= amountCents;
  this.reservedBalanceCents += amountCents;
  this._addTransaction("ORDER_RESERVE", -amountCents, referenceId, `Reserved for order ${referenceId}`);
  return this.save(session ? { session } : {});
};

/**
 * Release reserved funds back to available (on cancel).
 */
WalletSchema.methods.releaseFunds = async function (amountCents, referenceId, session) {
  this.reservedBalanceCents = Math.max(0, this.reservedBalanceCents - amountCents);
  this.availableBalanceCents += amountCents;
  this._addTransaction("ORDER_RELEASE", amountCents, referenceId, `Released from order ${referenceId}`);
  return this.save(session ? { session } : {});
};

/**
 * Debit reserved funds after a trade fill.
 */
WalletSchema.methods.debitReserved = async function (amountCents, referenceId, session) {
  this.reservedBalanceCents = Math.max(0, this.reservedBalanceCents - amountCents);
  this._addTransaction("TRADE_DEBIT", -amountCents, referenceId, `Debit for trade ${referenceId}`);
  return this.save(session ? { session } : {});
};

/**
 * Credit available balance (e.g., trade proceeds, settlement).
 */
WalletSchema.methods.creditAvailable = async function (amountCents, type, referenceId, description, session) {
  this.availableBalanceCents += amountCents;
  this._addTransaction(type || "TRADE_CREDIT", amountCents, referenceId, description || `Credit ${referenceId}`);
  return this.save(session ? { session } : {});
};

WalletSchema.methods._addTransaction = function (type, amountCents, referenceId, description) {
  const tx = {
    type,
    amountCents,
    balanceAfterCents: this.availableBalanceCents + this.reservedBalanceCents,
    referenceId,
    description,
  };
  this.transactions.push(tx);
  // Keep last 1000 transactions
  if (this.transactions.length > 1000) {
    this.transactions.splice(0, this.transactions.length - 1000);
  }
};

module.exports = mongoose.model("Wallet", WalletSchema);