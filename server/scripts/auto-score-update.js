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

  // NFL season typically starts the first Thursday in September
  // This is a simplified calculation - you might want to make this more sophisticated
  const seasonStart = new Date(currentYear, 8, 1); // September 1st

  // Calculate weeks since season start
  const weekOffset = Math.floor(
    (now - seasonStart) / (7 * 24 * 60 * 60 * 1000)
  );

  // NFL season typically runs 18 weeks (17 regular season + 1 week for playoffs)
  // This is a simplified calculation
  const currentWeek = Math.max(1, Math.min(18, weekOffset + 1));

  return currentWeek;
}

async function autoScoreUpdate() {
  try {
    console.log("🔄 Starting automatic score update...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Get current week dynamically
    const currentSeason = new Date().getFullYear();
    const currentWeek = getCurrentNFLWeek();

    console.log(
      `📊 Fetching scores for Week ${currentWeek}, Season ${currentSeason}...`
    );

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
        `Processing: ${espnGame.awayTeam} @ ${espnGame.homeTeam} - Status: ${espnGame.status}`
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
