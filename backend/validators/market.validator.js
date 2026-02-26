// validators/market.validator.js
const { z } = require("zod");
const { MARKET_CATEGORIES } = require("../config/constants");

exports.createMarketSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20).max(2000),
  category: z.enum(MARKET_CATEGORIES),
  resolutionCriteria: z.string().min(10).max(1000),
  closesAt: z.string().datetime().refine(
    (val) => new Date(val) > new Date(),
    { message: "closesAt must be in the future" }
  ),
  tags: z.array(z.string().max(30)).max(5).optional(),
  imageUrl: z.string().url().optional(),
});

exports.updateMarketSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().min(20).max(2000).optional(),
  featured: z.boolean().optional(),
}).strict();

exports.resolveMarketSchema = z.object({
  outcome: z.enum(["YES", "NO"]),
  notes: z.string().max(500).optional(),
});

// validators/order.validator.js — included here for convenience
const { ORDER_SIDES, ORDER_TYPES, OUTCOMES, MIN_PRICE, MAX_PRICE } = require("../config/constants");

exports.placeOrderSchema = z.object({
  marketId: z.string().min(1),
  outcome: z.enum(Object.values(OUTCOMES)),
  side: z.enum(Object.values(ORDER_SIDES)),
  type: z.enum(Object.values(ORDER_TYPES)).default("LIMIT"),
  priceCents: z
    .number()
    .int("Price must be a whole number")
    .min(MIN_PRICE, `Price must be at least ${MIN_PRICE}¢`)
    .max(MAX_PRICE, `Price cannot exceed ${MAX_PRICE}¢`)
    .optional(),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1 share")
    .max(100000, "Quantity cannot exceed 100,000 shares"),
  clientOrderId: z.string().max(64).optional(),
}).refine(
  (data) => {
    if (data.type === "LIMIT" && !data.priceCents) {
      return false;
    }
    return true;
  },
  { message: "priceCents is required for LIMIT orders", path: ["priceCents"] }
);

exports.cancelOrderSchema = z.object({
  orderId: z.string().min(1),
});