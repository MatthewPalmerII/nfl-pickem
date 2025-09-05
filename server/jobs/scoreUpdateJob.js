const cron = require("node-cron");
const autoScoreUpdate = require("../scripts/auto-score-update");
const scoringService = require("../services/scoringService");

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

      // Use our new automatic score update script
      await autoScoreUpdate();

      console.log("✅ Score update completed successfully");
    } catch (error) {
      console.error("❌ Error updating scores:", error);
    } finally {
      this.isRunning = false;
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
