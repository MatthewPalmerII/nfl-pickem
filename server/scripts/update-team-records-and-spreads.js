const mongoose = require("mongoose");
const Game = require("../models/Game");
const espnService = require("../services/espnService");

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/nfl-pickem"
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const updateTeamRecordsAndSpreads = async () => {
  try {
    console.log("🏈 Updating team records and spreads...");

    const currentSeason = new Date().getFullYear();

    // Get current team standings
    console.log("📊 Fetching team standings...");
    const standings = await espnService.getTeamStandings(currentSeason);
    console.log(`Found records for ${Object.keys(standings).length} teams`);

    // Update team records in all games
    console.log("🔄 Updating team records in games...");
    const games = await Game.find({ season: currentSeason });

    let updatedGames = 0;
    for (const game of games) {
      let needsUpdate = false;
      const updates = {};

      // Update away team record
      if (standings[game.awayTeam]) {
        updates.awayRecord = standings[game.awayTeam];
        needsUpdate = true;
      }

      // Update home team record
      if (standings[game.homeTeam]) {
        updates.homeRecord = standings[game.homeTeam];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Game.findByIdAndUpdate(game._id, updates);
        updatedGames++;
        console.log(
          `   ✅ Updated ${game.awayTeam} (${
            updates.awayRecord || game.awayRecord
          }) @ ${game.homeTeam} (${updates.homeRecord || game.homeRecord})`
        );
      }
    }

    console.log(`📈 Updated records for ${updatedGames} games`);

    // Update spreads for current and upcoming weeks
    console.log("🎯 Fetching and updating spreads...");
    const currentWeek = Math.min(
      18,
      Math.max(
        1,
        Math.ceil(
          (new Date() - new Date(currentSeason, 8, 1)) /
            (7 * 24 * 60 * 60 * 1000)
        )
      )
    );

    for (
      let week = Math.max(1, currentWeek - 1);
      week <= Math.min(18, currentWeek + 2);
      week++
    ) {
      console.log(`   📅 Processing Week ${week}...`);

      try {
        const odds = await espnService.getGameOdds(currentSeason, week);
        console.log(`   Found odds for ${Object.keys(odds).length} games`);

        const weekGames = await Game.find({ week, season: currentSeason });

        for (const game of weekGames) {
          const gameKey = `${game.awayTeam}@${game.homeTeam}`;
          const gameOdds = odds[gameKey];

          if (gameOdds) {
            const updates = {};
            if (gameOdds.spread) {
              updates.spread = gameOdds.spread;
            }
            if (gameOdds.overUnder) {
              updates.overUnder = gameOdds.overUnder;
            }

            if (Object.keys(updates).length > 0) {
              await Game.findByIdAndUpdate(game._id, updates);
              console.log(
                `     ✅ Updated odds for ${game.awayTeam} @ ${
                  game.homeTeam
                }: ${updates.spread || "N/A"} (O/U: ${
                  updates.overUnder || "N/A"
                })`
              );
            }
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Error processing Week ${week}: ${error.message}`);
      }
    }

    console.log("✅ Team records and spreads updated successfully!");
  } catch (error) {
    console.error("❌ Error updating team records and spreads:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

// Run the script
connectDB().then(() => {
  updateTeamRecordsAndSpreads();
});
