#!/usr/bin/env node

const mongoose = require("mongoose");
const Game = require("../models/Game");
const GameResult = require("../models/GameResult");
const espnService = require("../services/espnService");
const scoringService = require("../services/scoringService");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

/**
 * Get current NFL week dynamically
 */
function getCurrentNFLWeek() {
  const now = new Date();
  const currentYear = now.getFullYear();

  // For now, let's use a fixed week for testing
  // You can adjust this based on the actual NFL schedule
  const currentWeek = 1; // Start with Week 1 for testing

  console.log(`📅 Current date: ${now.toISOString()}`);
  console.log(`📅 Calculated week: ${currentWeek} for season ${currentYear}`);

  return currentWeek;
}

async function autoScoreUpdate() {
  try {
    console.log("🔄 Starting automatic score update...");

    // Database should already be connected from main server
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️ Database not connected, connecting...");
      await connectDB();
    } else {
      console.log("✅ Database already connected");
    }

    // Get current week dynamically
    const currentSeason = new Date().getFullYear();
    const currentWeek = getCurrentNFLWeek();

    console.log(
      `📊 Fetching scores for Week ${currentWeek}, Season ${currentSeason}...`
    );

    // Check what games we have in the database
    const dbGames = await Game.find({ season: currentSeason }).sort({
      week: 1,
    });
    console.log(
      `📊 Found ${dbGames.length} games in database for season ${currentSeason}`
    );
    dbGames.forEach((game) => {
      console.log(
        `  Week ${game.week}: ${game.awayTeam} @ ${game.homeTeam} - Status: ${game.status}`
      );
    });

    // Try to find the Cowboys @ Eagles game specifically
    const cowboysEaglesGame = await Game.findOne({
      $or: [
        { awayTeam: "Cowboys", homeTeam: "Eagles" },
        { awayTeam: "Eagles", homeTeam: "Cowboys" },
      ],
      season: currentSeason,
    });

    if (cowboysEaglesGame) {
      console.log(
        `🏈 Found Cowboys @ Eagles game: Week ${cowboysEaglesGame.week}, Status: ${cowboysEaglesGame.status}, Score: ${cowboysEaglesGame.awayScore}-${cowboysEaglesGame.homeScore}`
      );

      // Try to get ESPN data for the specific week this game is in
      console.log(
        `🔍 Trying to get ESPN data for Week ${cowboysEaglesGame.week}...`
      );
      try {
        const espnGamesForThisWeek = await espnService.getWeekGames(
          currentSeason,
          cowboysEaglesGame.week
        );
        console.log(
          `📊 ESPN returned ${espnGamesForThisWeek.length} games for Week ${cowboysEaglesGame.week}`
        );

        const espnCowboysEagles = espnGamesForThisWeek.find(
          (game) =>
            (game.awayTeam === "Cowboys" && game.homeTeam === "Eagles") ||
            (game.awayTeam === "Eagles" && game.homeTeam === "Cowboys")
        );

        if (espnCowboysEagles) {
          console.log(
            `🏈 ESPN Cowboys @ Eagles: Status: ${espnCowboysEagles.status}, Score: ${espnCowboysEagles.awayScore}-${espnCowboysEagles.homeScore}`
          );
        } else {
          console.log(
            `❌ Cowboys @ Eagles not found in ESPN Week ${cowboysEaglesGame.week} data`
          );
        }
      } catch (error) {
        console.log(
          `❌ Error getting ESPN data for Week ${cowboysEaglesGame.week}:`,
          error.message
        );
      }
    } else {
      console.log(`❌ Cowboys @ Eagles game not found in database`);
    }

    // Get current scores from ESPN
    const espnGames = await espnService.getWeekGames(
      currentSeason,
      currentWeek
    );
    console.log(`Found ${espnGames.length} games from ESPN`);

    let updatedGames = 0;
    let processedResults = 0;

    // Update games in database
    for (const espnGame of espnGames) {
      if (!espnGame) continue;

      console.log(
        `Processing: ${espnGame.awayTeam} @ ${espnGame.homeTeam} - Status: ${espnGame.status}, Score: ${espnGame.awayScore}-${espnGame.homeScore}`
      );

      // Find the game in our database
      const dbGame = await Game.findOne({
        $or: [
          { awayTeam: espnGame.awayTeam, homeTeam: espnGame.homeTeam },
          { awayTeam: espnGame.homeTeam, homeTeam: espnGame.awayTeam },
        ],
        week: currentWeek,
        season: currentSeason,
      });

      if (dbGame) {
        console.log(
          `  Database game: Status: ${dbGame.status}, Score: ${dbGame.awayScore}-${dbGame.homeScore}`
        );

        // Check if we need to update this game
        const needsUpdate =
          dbGame.status !== espnGame.status ||
          dbGame.awayScore !== espnGame.awayScore ||
          dbGame.homeScore !== espnGame.homeScore;

        if (needsUpdate) {
          console.log(
            `  Updating: ${espnGame.awayTeam} @ ${espnGame.homeTeam} - Status: ${espnGame.status}, Score: ${espnGame.awayScore}-${espnGame.homeScore}`
          );

          // Determine winner
          let winner = null;
          if (espnGame.status === "final") {
            if (espnGame.awayScore > espnGame.homeScore) {
              winner = espnGame.awayTeam;
            } else if (espnGame.homeScore > espnGame.awayScore) {
              winner = espnGame.homeTeam;
            }
          }

          // Update the game with ESPN data
          await Game.findByIdAndUpdate(dbGame._id, {
            status: espnGame.status,
            awayScore: espnGame.awayScore,
            homeScore: espnGame.homeScore,
            quarter: espnGame.quarter,
            timeRemaining: espnGame.timeRemaining,
            winner: winner,
            updatedAt: new Date(),
          });

          updatedGames++;

          // Create or update GameResult if game is final
          if (espnGame.status === "final") {
            const existingResult = await GameResult.findOne({
              gameId: dbGame._id,
            });

            if (existingResult) {
              await GameResult.findByIdAndUpdate(existingResult._id, {
                awayScore: espnGame.awayScore,
                homeScore: espnGame.homeScore,
                status: "final",
                winner: winner,
                processed: false, // Reset processed flag so it gets reprocessed
                updatedAt: new Date(),
              });
            } else {
              const gameResult = new GameResult({
                gameId: dbGame._id,
                awayTeam: espnGame.awayTeam,
                homeTeam: espnGame.homeTeam,
                awayScore: espnGame.awayScore,
                homeScore: espnGame.homeScore,
                status: "final",
                winner: winner,
                processed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              await gameResult.save();
            }
            processedResults++;
          }
        } else {
          console.log(
            `  No update needed: ${espnGame.awayTeam} @ ${espnGame.homeTeam}`
          );
        }
      } else {
        console.log(
          `  Game not found in database: ${espnGame.awayTeam} @ ${espnGame.homeTeam}`
        );
      }
    }

    console.log(
      `\n📈 Updated ${updatedGames} games, created/updated ${processedResults} game results`
    );

    // Process any unprocessed game results
    if (processedResults > 0) {
      console.log("\n🔄 Processing game results...");
      await scoringService.processAllResults();
      console.log("✅ Game results processed successfully!");
    }

    console.log("✅ Automatic score update completed!");
  } catch (error) {
    console.error("❌ Error during automatic score update:", error);
  }
  // Note: Don't close the database connection here as it's shared with the main server
}

// Run the script
if (require.main === module) {
  autoScoreUpdate();
}

module.exports = autoScoreUpdate;
