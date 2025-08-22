const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../models/User");
const Game = require("../models/Game");
const Pick = require("../models/Pick");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const wipeAllData = async () => {
  try {
    console.log("🧹 Starting complete data wipe...");

    // Clear ALL data
    await Pick.deleteMany({});
    console.log("🗑️ Cleared all picks");

    await Game.deleteMany({});
    console.log("🗑️ Cleared all games");

    await User.deleteMany({});
    console.log("🗑️ Cleared all users");

    console.log("\n✅ Database completely wiped!");
    console.log("🚀 Now run: npm run seed-simple");
  } catch (error) {
    console.error("❌ Wipe error:", error);
  }
};

// Run the script
connectDB()
  .then(wipeAllData)
  .finally(() => {
    mongoose.connection.close();
    console.log("📊 Database connection closed");
  });
