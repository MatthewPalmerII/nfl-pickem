const cron = require("node-cron");
const espnService = require("../services/espnService");
const scoringService = require("../services/scoringService");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");

class ScoreUpdateJob {
  constructor() {
    this.isRunning = false;
    this.currentSeason = new Date().getFullYear();
  }

  /**
   * Start the automated score update job
   */
  start() {
    console.log("🚀 Starting automated score update job...");

    // Update scores every 2 minutes during NFL season
    cron.schedule(
      "*/2 * * * *",
      () => {
        this.updateScores();
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    // Process results every 5 minutes
    cron.schedule(
      "*/5 * * * *",
      () => {
        this.processResults();
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    // Weekly winner calculation every Monday at 2 AM ET
    cron.schedule(
      "0 2 * * 1",
      () => {
        this.calculateWeeklyWinners();
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    console.log("✅ Score update job started successfully");
  }

  /**
   * Stop the automated score update job
   */
  stop() {
    console.log("🛑 Stopping automated score update job...");
    // Note: node-cron doesn't have a built-in stop method
    // This would need to be implemented with proper job management
  }

  /**
   * Update scores for all active weeks
   */
  async updateScores() {
    if (this.isRunning) {
      console.log("⏳ Score update already running, skipping...");
      return;
    }

    this.isRunning = true;

    try {
      console.log("🔄 Starting score update...");

      // Get current NFL week (you might want to make this more sophisticated)
      const currentWeek = this.getCurrentNFLWeek();

      if (!currentWeek) {
        console.log("📅 No active NFL week found, skipping score update");
        return;
      }

      console.log(`🏈 Updating scores for Week ${currentWeek}`);

      // Fetch live scores from ESPN
      const liveScores = await espnService.getLiveScores(
        this.currentSeason,
        currentWeek
      );

      if (!liveScores || liveScores.length === 0) {
        console.log(
          "ℹ️ No live scores received from ESPN - games may not have started yet"
        );
        return;
      }

      console.log(`📊 Received ${liveScores.length} live scores from ESPN`);

      // Update or create game results
      for (const liveScore of liveScores) {
        await this.updateGameResult(liveScore, currentWeek);
      }

      console.log("✅ Score update completed successfully");
    } catch (error) {
      console.error("❌ Error updating scores:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update or create a game result
   */
  async updateGameResult(liveScore, week) {
    try {
      // Find the game in our database
      const game = await Game.findOne({
        awayTeam: liveScore.awayTeam,
        homeTeam: liveScore.homeTeam,
        week: week,
      });

      if (!game) {
        console.log(
          `⚠️ Game not found in database: ${liveScore.awayTeam} @ ${liveScore.homeTeam}`
        );
        return;
      }

      // Check if we already have a result for this game
      let gameResult = await GameResult.findOne({ gameId: game._id });

      if (!gameResult) {
        // Create new game result
        gameResult = new GameResult({
          gameId: game._id,
          awayTeam: liveScore.awayTeam,
          homeTeam: liveScore.homeTeam,
          espnGameId: liveScore.espnGameId,
        });
      }

      // Update with latest data
      gameResult.awayScore = liveScore.awayScore;
      gameResult.homeScore = liveScore.homeScore;
      gameResult.status = liveScore.status;
      gameResult.quarter = liveScore.quarter;
      gameResult.timeRemaining = liveScore.timeRemaining;
      gameResult.lastUpdated = liveScore.lastUpdated;

      // Calculate final score string
      if (liveScore.status === "final") {
        gameResult.finalScore = `${liveScore.awayScore}-${liveScore.homeScore}`;
      }

      await gameResult.save();

      console.log(
        `📝 Updated result for ${liveScore.awayTeam} @ ${liveScore.homeTeam}: ${liveScore.awayScore}-${liveScore.homeScore} (${liveScore.status})`
      );
    } catch (error) {
      console.error(
        `Error updating game result for ${liveScore.awayTeam} @ ${liveScore.homeTeam}:`,
        error
      );
    }
  }

  /**
   * Process all unprocessed results and calculate points
   */
  async processResults() {
    try {
      console.log("🔄 Processing game results and calculating points...");
      await scoringService.processAllResults();
      console.log("✅ Results processing completed");
    } catch (error) {
      console.error("❌ Error processing results:", error);
    }
  }

  /**
   * Calculate weekly winners
   */
  async calculateWeeklyWinners() {
    try {
      console.log("🏆 Calculating weekly winners...");

      // Get the previous week (since this runs Monday morning)
      const previousWeek = this.getCurrentNFLWeek() - 1;

      if (previousWeek > 0) {
        await scoringService.calculateWeeklyWinners(
          previousWeek,
          this.currentSeason
        );
        console.log(`✅ Weekly winners calculated for Week ${previousWeek}`);
      }
    } catch (error) {
      console.error("❌ Error calculating weekly winners:", error);
    }
  }

  /**
   * Get current NFL week (simplified - you might want to make this more sophisticated)
   */
  getCurrentNFLWeek() {
    const now = new Date();
    const seasonStart = new Date(this.currentSeason, 8, 1); // September 1st
    const weekOffset = Math.floor(
      (now - seasonStart) / (7 * 24 * 60 * 60 * 1000)
    );

    // NFL season typically starts around week 1 in early September
    // This is a simplified calculation
    const currentWeek = Math.max(1, Math.min(18, weekOffset + 1));

    return currentWeek;
  }

  /**
   * Manual trigger for score update (for testing)
   */
  async manualUpdate() {
    console.log("🔧 Manual score update triggered");
    await this.updateScores();
  }

  /**
   * Manual trigger for results processing (for testing)
   */
  async manualProcess() {
    console.log("🔧 Manual results processing triggered");
    await this.processResults();
  }
}

module.exports = new ScoreUpdateJob();
