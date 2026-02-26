// database/redis.js
const Redis = require("ioredis");
const logger = require("../utils/logger");

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt #${times}, waiting ${delay}ms`);
    return delay;
  },
  lazyConnect: true,
  maxRetriesPerRequest: 3,
};

const redisClient = new Redis(redisConfig);

redisClient.on("connect", () => logger.info("✅ Redis connected"));
redisClient.on("ready", () => logger.info("✅ Redis ready"));
redisClient.on("error", (err) => logger.error("Redis error:", err.message));
redisClient.on("close", () => logger.warn("⚠️  Redis connection closed"));

module.exports = redisClient;