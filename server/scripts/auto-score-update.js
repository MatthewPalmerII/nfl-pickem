#!/usr/bin/env node

const mongoose = require("mongoose");
const Game = require("../models/Game");
const GameResult = require("../models/GameResult");
const Pick = require("../models/Pick");
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

  // Calculate the current NFL week based on the date
  // NFL season typically starts in early September
  const seasonStart = new Date(currentYear, 8, 1); // September 1st
  const daysSinceStart = Math.floor(
    (now - seasonStart) / (1000 * 60 * 60 * 24)
  );
  const currentWeek = Math.min(
    Math.max(Math.floor(daysSinceStart / 7) + 1, 1),
    18
  );

  console.log(`📅 Current date: ${now.toISOString()}`);
  console.log(`📅 Calculated week: ${currentWeek} for season ${currentYear}`);

  return currentWeek;
}

/**
 * Calculate pick results for finalized games
 */
async function calculatePickResults(season, week) {
  try {
    console.log(
      `🔍 Calculating pick results for Season ${season}, Week ${week}...`
    );

    // Get all finalized games for this week
    const finalizedGames = await Game.find({
      season,
      week,
      status: "final",
    });

    console.log(`Found ${finalizedGames.length} finalized games`);

    let updatedPicks = 0;

    for (const game of finalizedGames) {
      // Determine winner
      let winner = null;
      if (game.awayScore > game.homeScore) {
        winner = game.awayTeam;
      } else if (game.homeScore > game.awayScore) {
        winner = game.homeTeam;
      } else {
        winner = "tie";
      }

      // Update game with winner if not already set
      if (!game.winner) {
        await Game.findByIdAndUpdate(game._id, { winner });
        console.log(
          `  Set winner for ${game.awayTeam} @ ${game.homeTeam}: ${winner}`
        );
      }

      // Get all picks for this game
      const picks = await Pick.find({
        gameId: game._id,
        isCorrect: null, // Only update picks that haven't been processed yet
      });

      console.log(
        `  Found ${picks.length} unprocessed picks for ${game.awayTeam} @ ${game.homeTeam}`
      );

      // Update each pick
      for (const pick of picks) {
        const isCorrect = pick.selectedTeam === winner;
        const points = isCorrect ? 1 : 0;

        await Pick.findByIdAndUpdate(pick._id, {
          isCorrect,
          points,
        });

        console.log(
          `    User pick: ${pick.selectedTeam} - ${
            isCorrect ? "✅ Correct" : "❌ Incorrect"
          } (Winner: ${winner})`
        );
        updatedPicks++;
      }
    }

    console.log(
      `✅ Updated ${updatedPicks} picks for ${finalizedGames.length} finalized games`
    );
  } catch (error) {
    console.error("❌ Error calculating pick results:", error);
    throw error;
  }
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

    // Process current week and previous weeks to catch up
    const weeksToProcess = [];
    for (let week = 1; week <= currentWeek; week++) {
      weeksToProcess.push(week);
    }
    console.log(`📊 Will process weeks: ${weeksToProcess.join(", ")}`);

    // Check what games we have in the database (check current season and next year for weeks 17-18)
    const dbGames = await Game.find({
      $or: [
        { season: currentSeason },
        { season: currentSeason + 1, week: { $gte: 17 } },
        { season: currentSeason - 1 },
      ],
    }).sort({
      week: 1,
    });
    console.log(
      `📊 Found ${dbGames.length} games in database for season ${currentSeason} (including adjacent seasons)`
    );
    dbGames.forEach((game) => {
      console.log(
        `  Week ${game.week}: ${game.awayTeam} @ ${game.homeTeam} - Status: ${game.status}`
      );
    });

    // Try to find the Cowboys @ Eagles game specifically (check multiple seasons)
    const cowboysEaglesGame = await Game.findOne({
      $or: [
        { awayTeam: "Cowboys", homeTeam: "Eagles" },
        { awayTeam: "Eagles", homeTeam: "Cowboys" },
      ],
      season: { $in: [currentSeason, currentSeason + 1, currentSeason - 1] },
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

    let totalUpdatedGames = 0;
    let totalProcessedResults = 0;

    // Process each week
    for (const week of weeksToProcess) {
      console.log(`\n📊 Processing Week ${week}...`);

      try {
        // Get current scores from ESPN for this week
        const espnGames = await espnService.getWeekGames(currentSeason, week);
        console.log(
          `Found ${espnGames.length} games from ESPN for Week ${week}`
        );

        let updatedGames = 0;
        let processedResults = 0;

        // Update games in database
        for (const espnGame of espnGames) {
          if (!espnGame) continue;

          console.log(
            `Processing: ${espnGame.awayTeam} @ ${espnGame.homeTeam} - Status: ${espnGame.status}, Score: ${espnGame.awayScore}-${espnGame.homeScore}`
          );

          // Find the game in our database
          // Check current season, next year (for weeks 17-18), and previous year (for edge cases)
          const dbGame = await Game.findOne({
            $or: [
              { awayTeam: espnGame.awayTeam, homeTeam: espnGame.homeTeam },
              { awayTeam: espnGame.homeTeam, homeTeam: espnGame.awayTeam },
            ],
            week: week,
            season: {
              $in: [currentSeason, currentSeason + 1, currentSeason - 1],
            },
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
          `✅ Week ${week}: Updated ${updatedGames} games, created/updated ${processedResults} game results`
        );
        totalUpdatedGames += updatedGames;
        totalProcessedResults += processedResults;

        // Calculate pick results for this week's finalized games
        if (processedResults > 0) {
          console.log(`🔄 Calculating pick results for Week ${week}...`);
          await calculatePickResults(currentSeason, week);
        }
      } catch (error) {
        console.error(`❌ Error processing Week ${week}:`, error.message);
        // Continue with other weeks even if one fails
      }
    }

    console.log(
      `\n📈 Total: Updated ${totalUpdatedGames} games, created/updated ${totalProcessedResults} game results`
    );

    // Process any unprocessed game results
    if (totalProcessedResults > 0) {
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
