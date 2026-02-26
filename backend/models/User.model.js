// models/User.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, underscore"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    // Reference to wallet
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },
    // User stats (denormalized for quick reads)
    stats: {
      totalTrades: { type: Number, default: 0 },
      marketsTraded: { type: Number, default: 0 },
      profitLoss: { type: Number, default: 0 }, // In cents
      winRate: { type: Number, default: 0 }, // 0-100
    },
    security: {
      failedLoginAttempts: { type: Number, default: 0 },
      lockUntil: { type: Date, default: null },
      lastLoginAt: { type: Date },
      lastLoginIp: { type: String },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.displayName) this.displayName = this.username;
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
UserSchema.methods.passwordsMatch = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isLocked = function () {
  return this.security.lockUntil && this.security.lockUntil > Date.now();
};

UserSchema.methods.handleFailedLogin = async function () {
  this.security.failedLoginAttempts += 1;
  if (this.security.failedLoginAttempts >= 5) {
    this.security.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    this.security.failedLoginAttempts = 0;
  }
  return this.save({ validateBeforeSave: false });
};

UserSchema.methods.handleSuccessfulLogin = async function (meta = {}) {
  this.security.failedLoginAttempts = 0;
  this.security.lockUntil = null;
  this.security.lastLoginAt = new Date();
  if (meta.ip) this.security.lastLoginIp = meta.ip;
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model("User", UserSchema);