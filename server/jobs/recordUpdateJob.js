const cron = require("node-cron");
const espnService = require("../services/espnService");
const Game = require("../models/Game");

class RecordUpdateJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Run daily at 6:00 AM
    cron.schedule("0 6 * * *", async () => {
      console.log("🕕 Starting daily team records and spreads update...");
      await this.updateRecordsAndSpreads();
    });

    // Also run immediately on startup (optional)
    console.log("🚀 Record update job scheduled for daily at 6:00 AM");
  }

  async updateRecordsAndSpreads() {
    if (this.isRunning) {
      console.log("⚠️ Record update already running, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log("🏈 Updating team records and spreads...");

      const currentSeason = new Date().getFullYear();

      // Get current team standings
      console.log("📊 Fetching team standings...");
      const standings = await espnService.getTeamStandings(currentSeason);
      console.log(`Found records for ${Object.keys(standings).length} teams`);

      // Create mapping from ESPN team names to database team names
      const teamNameMapping = {
        "Buffalo Bills": "Bills",
        "Miami Dolphins": "Dolphins",
        "New England Patriots": "Patriots",
        "New York Jets": "Jets",
        "Baltimore Ravens": "Ravens",
        "Cincinnati Bengals": "Bengals",
        "Cleveland Browns": "Browns",
        "Pittsburgh Steelers": "Steelers",
        "Houston Texans": "Texans",
        "Indianapolis Colts": "Colts",
        "Jacksonville Jaguars": "Jaguars",
        "Tennessee Titans": "Titans",
        "Denver Broncos": "Broncos",
        "Kansas City Chiefs": "Chiefs",
        "Las Vegas Raiders": "Raiders",
        "Los Angeles Chargers": "Chargers",
        "Dallas Cowboys": "Cowboys",
        "New York Giants": "Giants",
        "Philadelphia Eagles": "Eagles",
        "Washington Commanders": "Commanders",
        "Chicago Bears": "Bears",
        "Detroit Lions": "Lions",
        "Green Bay Packers": "Packers",
        "Minnesota Vikings": "Vikings",
        "Atlanta Falcons": "Falcons",
        "Carolina Panthers": "Panthers",
        "New Orleans Saints": "Saints",
        "Tampa Bay Buccaneers": "Buccaneers",
        "Arizona Cardinals": "Cardinals",
        "Los Angeles Rams": "Rams",
        "San Francisco 49ers": "49ers",
        "Seattle Seahawks": "Seahawks",
      };

      // Convert ESPN standings to database team names
      const mappedStandings = {};
      Object.entries(standings).forEach(([espnName, record]) => {
        const dbName = teamNameMapping[espnName];
        if (dbName) {
          mappedStandings[dbName] = record;
        } else {
          console.log(`⚠️ No mapping found for ESPN team: "${espnName}"`);
        }
      });

      console.log(`Mapped ${Object.keys(mappedStandings).length} team records`);

      // Update team records in all games
      if (Object.keys(mappedStandings).length > 0) {
        console.log("🔄 Updating team records in games...");
        const games = await Game.find({ season: currentSeason });
        console.log(`Found ${games.length} games in database`);

        let updatedGames = 0;
        for (const game of games) {
          let needsUpdate = false;
          const updates = {};

          // Update away team record
          if (mappedStandings[game.awayTeam]) {
            updates.awayRecord = mappedStandings[game.awayTeam];
            needsUpdate = true;
          }

          // Update home team record
          if (mappedStandings[game.homeTeam]) {
            updates.homeRecord = mappedStandings[game.homeTeam];
            needsUpdate = true;
          }

          if (needsUpdate) {
            await Game.findByIdAndUpdate(game._id, updates);
            updatedGames++;
          }
        }

        console.log(`📈 Updated records for ${updatedGames} games`);
      } else {
        console.log("⚠️ No team records found, skipping record updates");
      }

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

      const duration = new Date() - startTime;
      console.log(
        `✅ Team records and spreads updated successfully! (${duration}ms)`
      );
    } catch (error) {
      console.error("❌ Error updating team records and spreads:", error);
    } finally {
      this.isRunning = false;
    }
  }

  // Manual trigger method
  async runNow() {
    console.log("🔄 Manually triggering record update...");
    await this.updateRecordsAndSpreads();
  }
}

module.exports = new RecordUpdateJob();
