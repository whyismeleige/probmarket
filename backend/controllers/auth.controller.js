// controllers/auth.controller.js
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/asyncHandler");
const db = require("../models");
const { createToken, sanitizeUser, getCookieOptions, getMetaData } = require("../utils/auth.utils");
const { AuthenticationError, ValidationError } = require("../utils/error.utils");
const { INITIAL_WALLET_BALANCE } = require("../config/constants");

/**
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, displayName } = req.body;

  // Check uniqueness before starting transaction (faster fail)
  const [emailExists, usernameExists] = await Promise.all([
    db.user.findOne({ email }),
    db.user.findOne({ username }),
  ]);
  if (emailExists) throw new ValidationError("Email is already registered");
  if (usernameExists) throw new ValidationError("Username is already taken");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create user
    const [newUser] = await db.user.create(
      [{ username, email, password, displayName: displayName || username }],
      { session }
    );

    // Create wallet with initial balance
    const balanceCents = Math.round(INITIAL_WALLET_BALANCE * 100);
    const [newWallet] = await db.wallet.create(
      [{ userId: newUser._id, availableBalanceCents: balanceCents }],
      { session }
    );

    // Link wallet to user
    newUser.wallet = newWallet._id;
    await newUser.save({ session });

    await session.commitTransaction();

    const token = createToken({ id: newUser._id });
    res.cookie("token", token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user: sanitizeUser(newUser) },
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const meta = getMetaData(req);

  const user = await db.user.findOne({ email }).select("+password");
  if (!user) throw new AuthenticationError("Invalid credentials");

  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.security.lockUntil - Date.now()) / 60000);
    throw new AuthenticationError(`Account locked. Try again in ${minutesLeft} minutes.`);
  }

  const passwordMatch = await user.passwordsMatch(password);
  if (!passwordMatch) {
    await user.handleFailedLogin();
    throw new AuthenticationError("Invalid credentials");
  }

  await user.handleSuccessfulLogin(meta);
  const token = createToken({ id: user._id });
  res.cookie("token", token, getCookieOptions());

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: { user: sanitizeUser(user) },
  });
});

/**
 * @route   GET /api/auth/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await db.user.findById(req.user._id).populate("wallet", "availableBalanceCents reservedBalanceCents");
  return res.status(200).json({
    success: true,
    data: { user: sanitizeUser(user) },
  });
});

/**
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
});