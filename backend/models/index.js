// models/index.js
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;
db.user     = require("./User.model");
db.wallet   = require("./Wallet.model");
db.market   = require("./Market.model");
db.order    = require("./Order.model");
db.trade    = require("./Trade.model");
db.position = require("./Position.model");
db.stock    = require("./Stock.model");  // ← Live market simulator stocks

module.exports = db;