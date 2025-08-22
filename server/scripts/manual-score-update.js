#!/usr/bin/env node

const mongoose = require("mongoose");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");
const scoringService = require("../services/scoringService");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

async function manualScoreUpdate() {
  try {
    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length < 4) {
      console.log(`
📝 Usage: node server/scripts/manual-score-update.js <awayTeam> <homeTeam> <awayScore> <homeScore> [week] [season]

Examples:
  node server/scripts/manual-score-update.js "Eagles" "Cowboys" 24 21
  node server/scripts/manual-score-update.js "Eagles" "Cowboys" 24 21 1 2024

This will:
  1. Find the game by teams and week
  2. Update or create the game result
  3. Recalculate all points automatically
  4. Show updated standings
`);
      process.exit(1);
    }

    const [awayTeam, homeTeam, awayScore, homeScore, week = 1, season = 2024] =
      args;

    console.log(`🏈 Updating score for ${awayTeam} @ ${homeTeam}`);
    console.log(
      `📊 New Score: ${awayTeam} ${awayScore} - ${homeTeam} ${homeScore}`
    );
    console.log(`📅 Week ${week}, Season ${season}`);

    // Find the game
    const game = await Game.findOne({
      awayTeam,
      homeTeam,
      week: parseInt(week),
      season: parseInt(season),
    });

    if (!game) {
      console.log(
        `❌ Game not found: ${awayTeam} @ ${homeTeam} (Week ${week})`
      );
      console.log("Available games:");
      const allGames = await Game.find({
        week: parseInt(week),
        season: parseInt(season),
      });
      allGames.forEach((g) => console.log(`  - ${g.awayTeam} @ ${g.homeTeam}`));
      process.exit(1);
    }

    console.log(`✅ Found game: ${game.awayTeam} @ ${game.homeTeam}`);

    // Find or create game result
    let gameResult = await GameResult.findOne({ gameId: game._id });

    if (!gameResult) {
      gameResult = new GameResult({
        gameId: game._id,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        espnGameId: null,
      });
      console.log("📝 Creating new game result");
    } else {
      console.log(
        `📝 Updating existing game result (was: ${gameResult.awayScore}-${gameResult.homeScore})`
      );
    }

    // Update the game result
    gameResult.awayScore = parseInt(awayScore);
    gameResult.homeScore = parseInt(homeScore);
    gameResult.finalScore = `${awayScore}-${homeScore}`;
    gameResult.status = "final";
    gameResult.lastUpdated = new Date();
    gameResult.processed = false; // Mark for reprocessing

    // Add manual update metadata
    gameResult.scoreOverride = {
      overriddenBy: null, // Manual update from terminal
      overriddenAt: new Date(),
      reason: "Manual score update from terminal",
      previousAwayScore: gameResult.awayScore || null,
      previousHomeScore: gameResult.homeScore || null,
      previousStatus: gameResult.status || null,
    };

    await gameResult.save();
    console.log(
      `✅ Score updated: ${awayTeam} ${awayScore} - ${homeTeam} ${homeScore}`
    );

    // Process the updated result to recalculate points
    console.log("🔄 Recalculating points...");
    await scoringService.processAllResults();

    console.log("✅ Points recalculated!");

    // Show updated standings
    console.log("\n📊 Updated Standings:");
    const standings = await scoringService.getStandings();
    standings.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}: ${user.totalPoints} points`);
    });

    // Show pick results for this game
    console.log(`\n🎯 Pick Results for ${awayTeam} @ ${homeTeam}:`);
    const Pick = require("../models/Pick");
    const picks = await Pick.find({ gameId: game._id }).populate(
      "userId",
      "name"
    );

    picks.forEach((pick) => {
      const result = pick.result;
      if (result) {
        const status = result.isCorrect ? "✅ Correct" : "❌ Incorrect";
        console.log(
          `  ${pick.userId.name}: ${pick.selectedTeam} - ${status} (${result.points} points)`
        );
      }
    });

    console.log("\n🎉 Manual score update completed successfully!");
  } catch (error) {
    console.error("❌ Error updating score:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the script
manualScoreUpdate();
