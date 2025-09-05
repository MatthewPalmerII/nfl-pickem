#!/usr/bin/env node

const mongoose = require("mongoose");
const Game = require("../models/Game");
const GameResult = require("../models/GameResult");
const scoringService = require("../services/scoringService");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

async function productionUpdate() {
  try {
    console.log("🌐 Starting production update...");

    // Check if we're connecting to production
    const isProduction =
      process.env.MONGODB_URI &&
      process.env.MONGODB_URI.includes("mongodb.net");

    if (!isProduction) {
      console.log(
        "⚠️  Warning: This appears to be a local database connection"
      );
      console.log("   Make sure your .env has the production MONGODB_URI");
      const proceed = await askQuestion("Continue anyway? (y/N): ");
      if (proceed.toLowerCase() !== "y") {
        console.log("❌ Aborted");
        process.exit(0);
      }
    }

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    console.log("\n📋 Available Operations:");
    console.log("1. Fetch current NFL schedule from ESPN");
    console.log("2. Update game scores manually");
    console.log("3. Process all game results");
    console.log("4. Calculate weekly winners");
    console.log("5. Show current standings");
    console.log("6. Exit");

    const choice = await askQuestion("\nSelect operation (1-6): ");

    switch (choice) {
      case "1":
        await fetchNFLSchedule();
        break;
      case "2":
        await manualScoreUpdate();
        break;
      case "3":
        await processResults();
        break;
      case "4":
        await calculateWeeklyWinners();
        break;
      case "5":
        await showStandings();
        break;
      case "6":
        console.log("👋 Goodbye!");
        break;
      default:
        console.log("❌ Invalid choice");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

async function fetchNFLSchedule() {
  console.log("\n🏈 Fetching NFL schedule from ESPN...");

  try {
    const espnService = require("../services/espnService");
    const espn = new espnService();

    // Fetch current week games
    const currentWeek = 1; // You can make this dynamic
    const games = await espn.getWeekGames(2024, currentWeek);

    if (games.length === 0) {
      console.log("ℹ️ No games found - season may not have started");
      return;
    }

    console.log(`✅ Found ${games.length} games for Week ${currentWeek}`);

    // Save games to database
    for (const gameData of games) {
      const existingGame = await Game.findOne({
        awayTeam: gameData.awayTeam,
        homeTeam: gameData.homeTeam,
        week: gameData.week,
        season: gameData.season,
      });

      if (!existingGame) {
        const game = new Game(gameData);
        await game.save();
        console.log(`📝 Created: ${game.awayTeam} @ ${game.homeTeam}`);
      } else {
        console.log(
          `ℹ️ Already exists: ${gameData.awayTeam} @ ${gameData.homeTeam}`
        );
      }
    }

    console.log("✅ NFL schedule updated successfully!");
  } catch (error) {
    console.error("❌ Error fetching NFL schedule:", error);
  }
}

async function manualScoreUpdate() {
  console.log("\n🔧 Manual Score Update");

  const awayTeam = await askQuestion("Away Team: ");
  const homeTeam = await askQuestion("Home Team: ");
  const awayScore = await askQuestion("Away Score: ");
  const homeScore = await askQuestion("Home Score: ");
  const week = (await askQuestion("Week (default 1): ")) || "1";

  try {
    // Use the existing manual score update logic
    const { execSync } = require("child_process");
    const command = `npm run manual-score "${awayTeam}" "${homeTeam}" ${awayScore} ${homeScore} ${week}`;

    console.log(`🔄 Running: ${command}`);
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error("❌ Error updating score:", error);
  }
}

async function processResults() {
  console.log("\n🔄 Processing all game results...");

  try {
    await scoringService.processAllResults();
    console.log("✅ Results processed successfully!");
  } catch (error) {
    console.error("❌ Error processing results:", error);
  }
}

async function calculateWeeklyWinners() {
  console.log("\n🏆 Calculating weekly winners...");

  try {
    await scoringService.calculateWeeklyWinners();
    console.log("✅ Weekly winners calculated!");
  } catch (error) {
    console.error("❌ Error calculating weekly winners:", error);
  }
}

async function showStandings() {
  console.log("\n📊 Current Standings:");

  try {
    const standings = await scoringService.getStandings();
    standings.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}: ${user.totalPoints} points`);
    });
  } catch (error) {
    console.error("❌ Error fetching standings:", error);
  }
}

async function askQuestion(question) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run the script
productionUpdate();
