// utils/logger.js
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

const { combine, timestamp, errors, splat, json, colorize, printf } = format;

const isDev = process.env.NODE_ENV !== "production";

const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    splat()
  ),
  transports: isDev
    ? [
        new transports.Console({
          format: combine(colorize(), devFormat),
        }),
      ]
    : [
        new transports.Console({ format: json() }),
        new transports.DailyRotateFile({
          filename: path.join("logs", "error-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          level: "error",
          maxFiles: "14d",
          format: json(),
        }),
        new transports.DailyRotateFile({
          filename: path.join("logs", "combined-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxFiles: "7d",
          format: json(),
        }),
      ],
});

module.exports = logger;