// scripts/seedData.js
// Seeds the database with sample markets, users, and initial order book liquidity

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const connectDB = require("../database/mongoDB");
const db = require("../models");

const USERS_TO_CREATE = 20;
const INITIAL_BALANCE_CENTS = 1000000; // $10,000 per user

const sampleMarkets = [
  {
    title: "Will the RBI cut interest rates before June 2025?",
    description: "The Reserve Bank of India will announce a repo rate cut of at least 25 bps at any MPC meeting before June 30, 2025.",
    category: "Finance",
    resolutionCriteria: "Resolves YES if RBI announces a repo rate cut of 25bps or more at any MPC meeting on or before June 30, 2025. Resolves NO otherwise.",
    closesAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    tags: ["rbi", "interest-rates", "india", "economy"],
  },
  {
    title: "Will India win the ICC T20 World Cup 2026?",
    description: "India will win the ICC Men's T20 World Cup 2026.",
    category: "Sports",
    resolutionCriteria: "Resolves YES if the Indian cricket team wins the 2026 ICC Men's T20 World Cup. Resolves NO if any other team wins.",
    closesAt: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
    tags: ["cricket", "icc", "india", "sports"],
  },
  {
    title: "Will Bitcoin reach $150,000 before the end of 2025?",
    description: "Bitcoin (BTC) will trade above $150,000 USD on any major exchange before December 31, 2025.",
    category: "Crypto",
    resolutionCriteria: "Resolves YES if Bitcoin price on Coinbase, Binance, or Kraken reaches $150,000 before Dec 31, 2025 00:00 UTC.",
    closesAt: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
    tags: ["bitcoin", "crypto", "btc", "price"],
  },
  {
    title: "Will Elon Musk remain CEO of Tesla through 2025?",
    description: "Elon Musk will be the CEO of Tesla, Inc. on December 31, 2025.",
    category: "Technology",
    resolutionCriteria: "Resolves YES if Elon Musk is officially the CEO of Tesla on Dec 31, 2025, per Tesla's investor relations page.",
    closesAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    tags: ["tesla", "elon-musk", "ceo", "tech"],
  },
  {
    title: "Will Anthropic release Claude 4 before mid-2025?",
    description: "Anthropic will publicly release a model in the 'Claude 4' family before July 1, 2025.",
    category: "Technology",
    resolutionCriteria: "Resolves YES if Anthropic announces and releases a model explicitly named 'Claude 4' or in the Claude 4 series before July 1, 2025.",
    closesAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    tags: ["anthropic", "claude", "ai", "llm"],
  },
  {
    title: "Will India's GDP growth exceed 7% in FY 2025-26?",
    description: "India's official GDP growth rate for FY 2025-26 will be 7% or higher, as reported by the Ministry of Statistics.",
    category: "Finance",
    resolutionCriteria: "Resolves YES if India's advance estimate or first revised estimate of GDP growth for FY 2025-26 is 7% or more.",
    closesAt: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    tags: ["india", "gdp", "economy", "finance"],
  },
  {
    title: "Will the next Apple iPhone have a foldable screen?",
    description: "Apple will announce or release an iPhone model with a foldable/folding screen design in 2025.",
    category: "Technology",
    resolutionCriteria: "Resolves YES if Apple officially announces an iPhone with a foldable form factor in 2025.",
    closesAt: new Date(Date.now() + 250 * 24 * 60 * 60 * 1000),
    tags: ["apple", "iphone", "foldable", "tech"],
  },
  {
    title: "Will SpaceX Starship successfully reach orbit in 2025?",
    description: "SpaceX Starship will complete a full orbital flight (achieve and maintain orbit for at least one full revolution) in 2025.",
    category: "Science",
    resolutionCriteria: "Resolves YES if SpaceX Starship achieves orbital velocity and completes at least one full orbit around Earth in 2025.",
    closesAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    tags: ["spacex", "starship", "space", "rocket"],
  },
];

async function seed() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await Promise.all([
      db.user.deleteMany({}),
      db.wallet.deleteMany({}),
      db.market.deleteMany({}),
      db.order.deleteMany({}),
      db.trade.deleteMany({}),
      db.position.deleteMany({}),
    ]);

    // Create admin user
    console.log("👑 Creating admin user...");
    const adminUser = await db.user.create({
      username: "admin",
      email: "admin@probmarket.com",
      password: "Admin@123",
      displayName: "ProbMarket Admin",
      role: "admin",
    });
    await db.wallet.create({
      userId: adminUser._id,
      availableBalanceCents: INITIAL_BALANCE_CENTS * 10,
    });
    await db.user.findByIdAndUpdate(adminUser._id, { wallet: (await db.wallet.findOne({ userId: adminUser._id }))._id });

    // Create regular users
    console.log(`👥 Creating ${USERS_TO_CREATE} users...`);
    const users = [];
    for (let i = 1; i <= USERS_TO_CREATE; i++) {
      const user = await db.user.create({
        username: `trader${i}`,
        email: `trader${i}@probmarket.com`,
        password: "Password@123",
        displayName: `Trader ${i}`,
        role: "user",
      });
      const wallet = await db.wallet.create({
        userId: user._id,
        availableBalanceCents: INITIAL_BALANCE_CENTS,
      });
      await db.user.findByIdAndUpdate(user._id, { wallet: wallet._id });
      users.push(user);
    }
    console.log(`✅ Created ${USERS_TO_CREATE} users (password: Password@123)`);

    // Create markets
    console.log("🏪 Creating prediction markets...");
    const markets = [];
    for (const marketData of sampleMarkets) {
      const market = await db.market.create({
        ...marketData,
        createdBy: adminUser._id,
        status: "OPEN",
        yesStats: { lastPrice: Math.floor(Math.random() * 50) + 25 },
        noStats: { lastPrice: Math.floor(Math.random() * 50) + 25 },
      });
      markets.push(market);
    }
    console.log(`✅ Created ${markets.length} markets`);

    console.log("\n✅ Seed complete!");
    console.log("─────────────────────────────────────────────");
    console.log("  Admin:   admin@probmarket.com / Admin@123");
    console.log("  Users:   trader1@probmarket.com / Password@123");
    console.log(`  Markets: ${markets.length} prediction markets created`);
    console.log("─────────────────────────────────────────────\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();