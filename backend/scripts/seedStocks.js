// scripts/seedStocks.js
// Populates the stocks collection with realistic-looking simulated tickers
// Usage: node scripts/seedStocks.js

require("dotenv").config();
const connectDB = require("../database/mongoDB");
const db = require("../models");

const STOCKS = [
  // ── Technology ──────────────────────────────────────────────────────────
  { symbol: "NVDA",  companyName: "NVIDIA Corporation",          currentPrice: 875.20,  sector: "Technology" },
  { symbol: "AAPL",  companyName: "Apple Inc.",                  currentPrice: 191.45,  sector: "Technology" },
  { symbol: "MSFT",  companyName: "Microsoft Corporation",       currentPrice: 415.30,  sector: "Technology" },
  { symbol: "GOOGL", companyName: "Alphabet Inc.",               currentPrice: 178.60,  sector: "Technology" },
  { symbol: "META",  companyName: "Meta Platforms Inc.",         currentPrice: 512.80,  sector: "Technology" },
  { symbol: "AMZN",  companyName: "Amazon.com Inc.",             currentPrice: 188.90,  sector: "Technology" },
  { symbol: "TSLA",  companyName: "Tesla Inc.",                  currentPrice: 247.10,  sector: "Automotive" },
  { symbol: "AMD",   companyName: "Advanced Micro Devices",      currentPrice: 163.40,  sector: "Technology" },
  { symbol: "INTC",  companyName: "Intel Corporation",           currentPrice: 31.75,   sector: "Technology" },
  { symbol: "CRM",   companyName: "Salesforce Inc.",             currentPrice: 295.60,  sector: "Technology" },

  // ── Finance ─────────────────────────────────────────────────────────────
  { symbol: "JPM",   companyName: "JPMorgan Chase & Co.",        currentPrice: 204.55,  sector: "Finance" },
  { symbol: "GS",    companyName: "Goldman Sachs Group Inc.",    currentPrice: 480.20,  sector: "Finance" },
  { symbol: "V",     companyName: "Visa Inc.",                   currentPrice: 279.85,  sector: "Finance" },
  { symbol: "BRK",   companyName: "Berkshire Hathaway Inc.",     currentPrice: 425.10,  sector: "Finance" },

  // ── Healthcare ──────────────────────────────────────────────────────────
  { symbol: "JNJ",   companyName: "Johnson & Johnson",           currentPrice: 152.30,  sector: "Healthcare" },
  { symbol: "PFE",   companyName: "Pfizer Inc.",                 currentPrice: 27.40,   sector: "Healthcare" },

  // ── Energy ──────────────────────────────────────────────────────────────
  { symbol: "XOM",   companyName: "Exxon Mobil Corporation",     currentPrice: 113.60,  sector: "Energy" },

  // ── Consumer ────────────────────────────────────────────────────────────
  { symbol: "NFLX",  companyName: "Netflix Inc.",                currentPrice: 638.45,  sector: "Consumer" },
  { symbol: "DIS",   companyName: "The Walt Disney Company",     currentPrice: 111.20,  sector: "Consumer" },
  { symbol: "SBUX",  companyName: "Starbucks Corporation",       currentPrice: 89.75,   sector: "Consumer" },
];

async function seedStocks() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    let created = 0;
    let skipped = 0;

    for (const stock of STOCKS) {
      const exists = await db.stock.findOne({ symbol: stock.symbol });
      if (exists) {
        skipped++;
        continue;
      }
      await db.stock.create({
        ...stock,
        previousClosePrice: stock.currentPrice,
        isActive: true,
      });
      created++;
      console.log(`  ✅ Created ${stock.symbol} — ${stock.companyName} @ $${stock.currentPrice}`);
    }

    console.log(`\n🎉 Done! Created: ${created}, Skipped (already exist): ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seedStocks();