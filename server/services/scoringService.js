const Pick = require("../models/Pick");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");
const User = require("../models/User");

class ScoringService {
  /**
   * Process all unprocessed game results and calculate points
   */
  async processAllResults() {
    try {
      console.log("🔄 Starting to process all unprocessed game results...");

      // Get all unprocessed final results
      const unprocessedResults = await GameResult.find({
        status: "final",
        processed: false,
      }).populate("gameId");

      console.log(
        `Found ${unprocessedResults.length} unprocessed final results`
      );

      for (const result of unprocessedResults) {
        await this.processGameResult(result);
      }

      console.log("✅ Finished processing all game results");
    } catch (error) {
      console.error("Error processing game results:", error);
      throw error;
    }
  }

  /**
   * Process a single game result and calculate points
   */
  async processGameResult(gameResult) {
    try {
      console.log(
        `🏈 Processing result for ${gameResult.awayTeam} @ ${gameResult.homeTeam}`
      );

      // Determine winner
      const winner = this.determineWinner(gameResult);

      // Update game result with winner
      await GameResult.findByIdAndUpdate(gameResult._id, {
        winner,
        processed: true,
        processedAt: new Date(),
      });

      // Get all picks for this game
      const picks = await Pick.find({
        gameId: gameResult.gameId._id,
      }).populate("userId");

      console.log(`Found ${picks.length} picks for this game`);

      // Calculate points for each pick
      for (const pick of picks) {
        await this.calculatePickPoints(pick, winner, gameResult);
      }

      console.log(
        `✅ Processed result for ${gameResult.awayTeam} @ ${gameResult.homeTeam}`
      );
    } catch (error) {
      console.error(`Error processing game result ${gameResult._id}:`, error);
      throw error;
    }
  }

  /**
   * Determine the winner of a game
   */
  determineWinner(gameResult) {
    if (gameResult.awayScore > gameResult.homeScore) {
      return gameResult.awayTeam;
    } else if (gameResult.homeScore > gameResult.awayScore) {
      return gameResult.homeTeam;
    } else {
      return "tie"; // Handle ties if needed
    }
  }

  /**
   * Calculate points for a specific pick
   */
  async calculatePickPoints(pick, winner, gameResult) {
    try {
      const isCorrect = pick.selectedTeam === winner;
      const points = isCorrect ? 1 : 0;

      // Update pick with result and points
      await Pick.findByIdAndUpdate(pick._id, {
        result: {
          winner,
          awayScore: gameResult.awayScore,
          homeScore: gameResult.homeScore,
          finalScore: `${gameResult.awayScore}-${gameResult.homeScore}`,
          isCorrect,
          points,
          processedAt: new Date(),
        },
      });

      console.log(
        `User ${pick.userId.name}: ${
          isCorrect ? "✅ Correct" : "❌ Incorrect"
        } pick for ${pick.selectedTeam} (Winner: ${winner})`
      );

      // Update user's total points
      await this.updateUserPoints(pick.userId._id, points);
    } catch (error) {
      console.error(`Error calculating points for pick ${pick._id}:`, error);
      throw error;
    }
  }

  /**
   * Update user's total points and weekly wins
   */
  async updateUserPoints(userId, points) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Get the week from the pick
      const pick = await Pick.findOne({ userId }).sort({ createdAt: -1 });
      if (!pick) return;

      const week = pick.week;
      const season = pick.season;

      // Update total points
      const totalPoints = (user.totalPoints || 0) + points;

      // Update weekly points
      const weeklyPoints = user.weeklyPoints || {};
      weeklyPoints[week] = (weeklyPoints[week] || 0) + points;

      // Update user
      await User.findByIdAndUpdate(userId, {
        totalPoints,
        weeklyPoints,
        lastUpdated: new Date(),
      });

      console.log(
        `Updated user ${user.name}: +${points} points (Total: ${totalPoints})`
      );
    } catch (error) {
      console.error(`Error updating user points for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate weekly winners after all games are processed
   */
  async calculateWeeklyWinners(week, season) {
    try {
      console.log(
        `🏆 Calculating weekly winners for Week ${week}, Season ${season}`
      );

      // Get all users with their weekly points
      const users = await User.find({}, "name weeklyPoints totalPoints");

      // Calculate weekly points for this week
      const weeklyResults = users.map((user) => ({
        userId: user._id,
        name: user.name,
        weeklyPoints: user.weeklyPoints?.[week] || 0,
        totalPoints: user.totalPoints || 0,
      }));

      // Sort by weekly points (descending)
      weeklyResults.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

      // Find the highest score
      const highestScore = weeklyResults[0]?.weeklyPoints || 0;

      // Find all users with the highest score (potential ties)
      const weeklyWinners = weeklyResults.filter(
        (user) => user.weeklyPoints === highestScore
      );

      console.log(`Week ${week} Results:`);
      weeklyResults.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}: ${user.weeklyPoints} points`);
      });

      if (weeklyWinners.length === 1) {
        console.log(
          `🏆 ${weeklyWinners[0].name} wins Week ${week} with ${highestScore} points!`
        );
      } else {
        console.log(
          `🤝 ${weeklyWinners.length}-way tie for Week ${week} with ${highestScore} points each`
        );
        console.log(
          "Tiebreaker: Monday Night Football combined score prediction"
        );
      }

      // Update user records with weekly wins
      for (const winner of weeklyWinners) {
        await User.findByIdAndUpdate(winner.userId, {
          $inc: { weeklyWins: 1 },
          lastUpdated: new Date(),
        });
      }

      return {
        week,
        season,
        highestScore,
        winners: weeklyWinners,
        isTie: weeklyWinners.length > 1,
      };
    } catch (error) {
      console.error(
        `Error calculating weekly winners for Week ${week}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get current standings
   */
  async getStandings() {
    try {
      const users = await User.find({}, "name totalPoints weeklyWins").sort({
        totalPoints: -1,
        weeklyWins: -1,
      });

      return users.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        totalPoints: user.totalPoints || 0,
        weeklyWins: user.weeklyWins || 0,
      }));
    } catch (error) {
      console.error("Error getting standings:", error);
      throw error;
    }
  }
}

module.exports = new ScoringService();
