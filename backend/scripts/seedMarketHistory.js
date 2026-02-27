// scripts/seedMarketHistory.js
// Populates priceHistory for every OPEN market with realistic simulated data.
//
// Generates points at 5-minute intervals going back 30 days.
// Uses a bounded random walk with mean-reversion so charts look natural.
//
// Usage:
//   node scripts/seedMarketHistory.js                  → seeds all OPEN markets
//   node scripts/seedMarketHistory.js --days 7         → only 7 days of history
//   node scripts/seedMarketHistory.js --clear          → wipe history before seeding
//
// After seeding, start the server normally. The MarketPriceSimulator will
// continue from where the seed left off.

require("dotenv").config();
const connectDB = require("../database/mongoDB");
const db = require("../models");
const { MARKET_STATUSES } = require("../config/constants");

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DAYS = (() => {
  const idx = args.indexOf("--days");
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 30;
})();
const CLEAR = args.includes("--clear");

// ─── Config ───────────────────────────────────────────────────────────────────
const POINT_INTERVAL_MINUTES = 5;   // One price point per 5 minutes
const POINTS_PER_DAY = (24 * 60) / POINT_INTERVAL_MINUTES; // = 288
const TOTAL_POINTS = DAYS * POINTS_PER_DAY;

// Market "personalities" — each starts at a different probability and
// has its own drift tendency, making each chart look unique.
const PERSONALITIES = [
  { startPrice: 71, drift: +0.001, volatility: 0.025 },  // Trending YES
  { startPrice: 58, drift: -0.0005, volatility: 0.020 }, // Slight NO lean
  { startPrice: 44, drift: 0,       volatility: 0.030 }, // Neutral, high vol
  { startPrice: 37, drift: -0.001, volatility: 0.022 },  // Trending NO
  { startPrice: 63, drift: +0.0008, volatility: 0.018 }, // Slow YES climb
  { startPrice: 52, drift: 0,       volatility: 0.035 }, // Very volatile
  { startPrice: 29, drift: +0.002,  volatility: 0.020 }, // Strong YES reversal
  { startPrice: 81, drift: -0.001, volatility: 0.015 },  // High confidence YES
];

// ─── Core random walk generator ───────────────────────────────────────────────
function generatePriceHistory(startPrice, drift, volatility, count, endTimestamp) {
  const interval = POINT_INTERVAL_MINUTES * 60 * 1000; // ms per point
  const startTimestamp = endTimestamp - count * interval;

  const points = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTimestamp + i * interval);

    // Random walk
    const randomWalk = (Math.random() - 0.5) * volatility * 100;

    // Mean reversion toward 50 — prevents runaway prices
    const meanReversion = (50 - price) * 0.005;

    // Individual drift (personality)
    const driftComponent = drift * 100;

    // Occasional "news event" shock (1% chance per tick)
    const shock = Math.random() < 0.01 ? (Math.random() - 0.5) * 15 : 0;

    price += randomWalk + meanReversion + driftComponent + shock;

    // Hard clamp to 2–98
    price = Math.max(2, Math.min(98, price));
    price = parseFloat(price.toFixed(1));

    points.push({ yesPrice: price, volume: Math.floor(Math.random() * 50), timestamp });
  }

  return points;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedMarketHistory() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    // Load all open markets
    const markets = await db.market.find({ status: MARKET_STATUSES.OPEN }).lean();
    console.log(`📊 Found ${markets.length} open markets to seed\n`);

    if (markets.length === 0) {
      console.log("⚠️  No open markets found. Run `npm run seed` first to create markets.");
      process.exit(0);
    }

    const now = Date.now();
    let seeded = 0;
    let skipped = 0;

    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      const marketId = market._id.toString();

      // Skip markets that already have history (unless --clear flag)
      if (!CLEAR && market.priceHistory && market.priceHistory.length > 50) {
        console.log(`  ⏭  Skipping ${market.title.slice(0, 50)}… (already has ${market.priceHistory.length} points)`);
        skipped++;
        continue;
      }

      // Assign a personality (cycle through list)
      const personality = PERSONALITIES[i % PERSONALITIES.length];
      const currentPrice = market.yesStats?.lastPrice ?? personality.startPrice;

      // Generate historical points
      const points = generatePriceHistory(
        currentPrice,
        personality.drift,
        personality.volatility,
        TOTAL_POINTS,
        now,
      );

      // Compute final price for stats update
      const finalPrice = points[points.length - 1].yesPrice;

      // Update market
      const updatePayload = {
        $set: {
          "yesStats.lastPrice": finalPrice,
          "noStats.lastPrice": parseFloat((100 - finalPrice).toFixed(1)),
        },
      };

      if (CLEAR) {
        updatePayload.$set.priceHistory = points;
      } else {
        updatePayload.$push = {
          priceHistory: {
            $each: points,
            $slice: -2000,
          },
        };
      }

      await db.market.findByIdAndUpdate(marketId, updatePayload);

      console.log(
        `  ✅ [${i + 1}/${markets.length}] ${market.title.slice(0, 55)}…\n` +
        `       ${points.length} points | start: ${personality.startPrice}¢ → end: ${finalPrice}¢`,
      );
      seeded++;
    }

    console.log(`\n${"─".repeat(60)}`);
    console.log(`🎉 Seeding complete!`);
    console.log(`   Seeded:  ${seeded} markets`);
    console.log(`   Skipped: ${skipped} markets (already had data)`);
    console.log(`   Range:   Last ${DAYS} days`);
    console.log(`   Points:  ${TOTAL_POINTS.toLocaleString()} per market (1 per ${POINT_INTERVAL_MINUTES} min)`);
    console.log(`${"─".repeat(60)}\n`);
    console.log(`ℹ️  Now start the server — the MarketPriceSimulator will`);
    console.log(`   continue generating live ticks from the current price.\n`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seedMarketHistory();