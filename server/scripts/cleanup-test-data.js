const mongoose = require("mongoose");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");
const Pick = require("../models/Pick");
const User = require("../models/User");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

async function cleanupTestData() {
  try {
    console.log("🧹 Starting test data cleanup...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Clean up test data from specific test runs
    console.log("\n🗑️ Cleaning up test data...");

    // Remove test users (by email pattern)
    const deletedUsers = await User.deleteMany({
      email: { $regex: /@example\.com$/ },
    });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} test users`);

    // Remove test games (by team names used in tests)
    const testTeamNames = [
      "Chiefs",
      "Lions",
      "Packers",
      "Bears",
      "Cowboys",
      "Giants",
      "Bills",
      "Jets",
    ];
    const deletedGames = await Game.deleteMany({
      $or: testTeamNames.map((team) => ({
        $or: [{ awayTeam: team }, { homeTeam: team }],
      })),
    });
    console.log(`✅ Deleted ${deletedGames.deletedCount} test games`);

    // Remove test picks (these should cascade with games, but let's be explicit)
    const deletedPicks = await Pick.deleteMany({
      week: 1,
      season: 2024,
    });
    console.log(`✅ Deleted ${deletedPicks.deletedCount} test picks`);

    // Remove test game results
    const deletedResults = await GameResult.deleteMany({
      $or: testTeamNames.map((team) => ({
        $or: [{ awayTeam: team }, { homeTeam: team }],
      })),
    });
    console.log(`✅ Deleted ${deletedResults.deletedCount} test game results`);

    console.log("\n🎉 Test data cleanup completed successfully!");
    console.log("\n📋 Cleanup Summary:");
    console.log(`- Users: ${deletedUsers.deletedCount} deleted`);
    console.log(`- Games: ${deletedGames.deletedCount} deleted`);
    console.log(`- Picks: ${deletedPicks.deletedCount} deleted`);
    console.log(`- Game Results: ${deletedResults.deletedCount} deleted`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the cleanup
cleanupTestData();
