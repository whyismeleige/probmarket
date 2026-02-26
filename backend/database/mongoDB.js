// database/mongoDB.js
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || "probmarket";

  if (!uri) throw new Error("MONGODB_URI environment variable not set");

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    logger.info(`✅ MongoDB connected → ${dbName}`)
  );
  mongoose.connection.on("error", (err) =>
    logger.error("MongoDB connection error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("⚠️  MongoDB disconnected. Attempting to reconnect...")
  );

  await mongoose.connect(uri, {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

module.exports = connectDB;