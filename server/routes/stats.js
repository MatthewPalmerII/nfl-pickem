const express = require("express");
const Pick = require("../models/Pick");
const Game = require("../models/Game");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/stats/user
// @desc    Get current user's statistics
// @access  Private
router.get("/user", auth, async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const userId = req.user._id;

    // Get user's picks for the season
    // NFL seasons span two calendar years (e.g., 2025 season = Sept 2025 - Jan 2026)
    // Check current season, next year, and previous year to handle season mismatches
    const picks = await Pick.find({
      userId,
      season: { $in: [season, season + 1, season - 1] },
    }).populate("gameId", "awayTeam homeTeam week winner");

    if (picks.length === 0) {
      return res.json({
        totalPicks: 0,
        correctPicks: 0,
        winPercentage: 0,
        currentStreak: 0,
        bestStreak: 0,
        rank: 0,
        totalPlayers: 0,
        weeklyBreakdown: [],
      });
    }

    // Calculate basic stats
    const totalPicks = picks.length;
    const correctPicks = picks.filter((pick) => pick.isCorrect === true).length;

    // Only count picks from finalized games for win percentage
    const finalizedPicks = picks.filter((pick) => pick.isCorrect !== null);
    const finalizedCorrectPicks = finalizedPicks.filter(
      (pick) => pick.isCorrect === true
    ).length;
    const winPercentage =
      finalizedPicks.length > 0
        ? Math.round((finalizedCorrectPicks / finalizedPicks.length) * 100)
        : 0;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Sort picks by week and submission time to calculate streaks
    const sortedPicks = picks
      .filter((pick) => pick.isCorrect !== null && pick.gameId) // Only count resolved picks with valid gameId
      .sort((a, b) => {
        if (!a.gameId || !b.gameId) return 0;
        if (a.gameId.week !== b.gameId.week) {
          return a.gameId.week - b.gameId.week;
        }
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      });

    for (const pick of sortedPicks) {
      if (pick.isCorrect) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Current streak is the last streak
    currentStreak = tempStreak;

    // Get weekly breakdown
    const weeklyBreakdown = [];
    const weekStats = {};

    picks.forEach((pick) => {
      if (!pick.gameId) return; // Skip picks with null gameId
      const week = pick.gameId.week;
      if (!weekStats[week]) {
        weekStats[week] = { correct: 0, total: 0 };
      }
      weekStats[week].total++;
      if (pick.isCorrect === true) {
        weekStats[week].correct++;
      }
    });

    Object.keys(weekStats)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((week) => {
        weeklyBreakdown.push({
          week: parseInt(week),
          correct: weekStats[week].correct,
          total: weekStats[week].total,
          percentage: Math.round(
            (weekStats[week].correct / weekStats[week].total) * 100
          ),
        });
      });

    // Calculate rank
    const allUsers = await User.countDocuments({ active: true });
    const userRank = await Pick.aggregate([
      {
        $match: {
          season: { $in: [season, season + 1, season - 1] },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$points" },
          totalPicks: { $sum: 1 },
        },
      },
      { $sort: { totalPoints: -1, totalPicks: -1 } },
    ]);

    const userRankIndex = userRank.findIndex(
      (user) => user._id.toString() === userId.toString()
    );
    const rank = userRankIndex >= 0 ? userRankIndex + 1 : allUsers;

    res.json({
      totalPicks,
      correctPicks,
      winPercentage,
      currentStreak,
      bestStreak,
      rank,
      totalPlayers: allUsers,
      weeklyBreakdown,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ message: "Server error getting user stats" });
  }
});

// @route   GET /api/stats/week/:week
// @desc    Get statistics for a specific week
// @access  Public
router.get("/week/:week", async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = parseInt(req.query.season) || new Date().getFullYear();

    if (week < 1 || week > 18) {
      return res.status(400).json({ message: "Invalid week number" });
    }

    // Get all picks for this week
    const picks = await Pick.find({ week, season })
      .populate("userId", "name email")
      .populate("gameId", "awayTeam homeTeam winner status");

    // Get games for this week
    const games = await Game.find({ week, season });

    // Calculate week statistics
    const totalGames = games.length;
    const totalPicks = picks.length;
    const totalPlayers = new Set(picks.map((p) => p.userId._id.toString()))
      .size;

    // Calculate pick distribution for each game
    const gameStats = games.map((game) => {
      const gamePicks = picks.filter(
        (p) => p.gameId._id.toString() === game._id.toString()
      );
      const awayPicks = gamePicks.filter(
        (p) => p.selectedTeam === game.awayTeam
      ).length;
      const homePicks = gamePicks.filter(
        (p) => p.selectedTeam === game.homeTeam
      ).length;

      return {
        gameId: game._id,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        awayPicks,
        homePicks,
        totalPicks: gamePicks.length,
        winner: game.winner,
        status: game.status,
      };
    });

    // Calculate overall week accuracy
    const resolvedPicks = picks.filter((p) => p.isCorrect !== null);
    const correctPicks = resolvedPicks.filter(
      (p) => p.isCorrect === true
    ).length;
    const overallAccuracy =
      resolvedPicks.length > 0
        ? Math.round((correctPicks / resolvedPicks.length) * 100)
        : 0;

    res.json({
      week,
      season,
      totalGames,
      totalPicks,
      totalPlayers,
      overallAccuracy,
      gameStats,
      picks: picks.map((p) => ({
        userId: p.userId._id,
        userName: p.userId.name,
        userEmail: p.userId.email,
        selectedTeam: p.selectedTeam,
        isCorrect: p.isCorrect,
        gameId: p.gameId._id,
      })),
    });
  } catch (error) {
    console.error("Get week stats error:", error);
    res.status(500).json({ message: "Server error getting week stats" });
  }
});

// @route   GET /api/stats/season
// @desc    Get overall season statistics
// @access  Public
router.get("/season", async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();

    // Get all picks for the season
    // Check current season, next year, and previous year to handle season mismatches
    const picks = await Pick.find({
      season: { $in: [season, season + 1, season - 1] },
    })
      .populate("userId", "name email")
      .populate("gameId", "week awayTeam homeTeam winner");

    // Get all games for the season (check multiple seasons)
    const games = await Game.find({
      season: { $in: [season, season + 1, season - 1] },
    });

    // Calculate season statistics
    const totalGames = games.length;
    const totalPicks = picks.length;
    const totalPlayers = new Set(picks.map((p) => p.userId._id.toString()))
      .size;

    // Calculate weekly breakdown
    const weeklyStats = {};
    for (let week = 1; week <= 18; week++) {
      const weekGames = games.filter((g) => g.week === week);
      const weekPicks = picks.filter((p) => p.gameId && p.gameId.week === week);
      const weekPlayers = new Set(weekPicks.map((p) => p.userId._id.toString()))
        .size;

      weeklyStats[week] = {
        games: weekGames.length,
        picks: weekPicks.length,
        players: weekPlayers,
        accuracy: 0,
      };

      // Calculate accuracy for resolved games
      const resolvedPicks = weekPicks.filter((p) => p.isCorrect !== null);
      if (resolvedPicks.length > 0) {
        const correctPicks = resolvedPicks.filter(
          (p) => p.isCorrect === true
        ).length;
        weeklyStats[week].accuracy = Math.round(
          (correctPicks / resolvedPicks.length) * 100
        );
      }
    }

    // Calculate overall accuracy
    const resolvedPicks = picks.filter((p) => p.isCorrect !== null);
    const correctPicks = resolvedPicks.filter(
      (p) => p.isCorrect === true
    ).length;
    const overallAccuracy =
      resolvedPicks.length > 0
        ? Math.round((correctPicks / resolvedPicks.length) * 100)
        : 0;

    // Get top performers
    // Check current season, next year, and previous year to handle season mismatches
    const topPerformers = await Pick.aggregate([
      {
        $match: {
          season: { $in: [season, season + 1, season - 1] },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalPoints: { $sum: "$points" },
          totalPicks: { $sum: 1 },
          correctPicks: { $sum: { $cond: ["$isCorrect", 1, 0] } },
        },
      },
      { $sort: { totalPoints: -1, totalPicks: -1 } },
      { $limit: 10 },
    ]);

    // Populate user names
    const topPerformersWithNames = await Promise.all(
      topPerformers.map(async (performer) => {
        const user = await User.findById(performer._id).select("name email");
        return {
          ...performer,
          userName: user.name,
          userEmail: user.email,
          winPercentage: Math.round(
            (performer.correctPicks / performer.totalPicks) * 100
          ),
        };
      })
    );

    res.json({
      season,
      totalGames,
      totalPicks,
      totalPlayers,
      overallAccuracy,
      weeklyStats,
      topPerformers: topPerformersWithNames,
    });
  } catch (error) {
    console.error("Get season stats error:", error);
    res.status(500).json({ message: "Server error getting season stats" });
  }
});

// @route   GET /api/stats/compare/:userId1/:userId2
// @desc    Compare statistics between two users
// @access  Public
router.get("/compare/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const season = parseInt(req.query.season) || new Date().getFullYear();

    // Get picks for both users
    // Check current season, next year, and previous year to handle season mismatches
    const [picks1, picks2] = await Promise.all([
      Pick.find({
        userId: userId1,
        season: { $in: [season, season + 1, season - 1] },
      }).populate("gameId", "week awayTeam homeTeam winner"),
      Pick.find({
        userId: userId2,
        season: { $in: [season, season + 1, season - 1] },
      }).populate("gameId", "week awayTeam homeTeam winner"),
    ]);

    // Get user info
    const [user1, user2] = await Promise.all([
      User.findById(userId1).select("name email"),
      User.findById(userId2).select("name email"),
    ]);

    if (!user1 || !user2) {
      return res.status(404).json({ message: "One or both users not found" });
    }

    // Calculate stats for both users
    const calculateUserStats = (picks) => {
      const totalPicks = picks.length;
      const correctPicks = picks.filter((p) => p.isCorrect === true).length;
      const winPercentage =
        totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;

      // Calculate weekly breakdown
      const weeklyStats = {};
      picks.forEach((pick) => {
        if (!pick.gameId) return; // Skip picks with null gameId
        const week = pick.gameId.week;
        if (!weeklyStats[week]) {
          weeklyStats[week] = { correct: 0, total: 0 };
        }
        weeklyStats[week].total++;
        if (pick.isCorrect === true) {
          weeklyStats[week].correct++;
        }
      });

      return {
        totalPicks,
        correctPicks,
        winPercentage,
        weeklyStats,
      };
    };

    const stats1 = calculateUserStats(picks1);
    const stats2 = calculateUserStats(picks2);

    // Find head-to-head picks (same games)
    const headToHead = [];
    const gameMap1 = {};
    const gameMap2 = {};

    picks1.forEach((pick) => {
      if (pick.gameId) {
        gameMap1[pick.gameId._id.toString()] = pick;
      }
    });

    picks2.forEach((pick) => {
      if (pick.gameId) {
        gameMap2[pick.gameId._id.toString()] = pick;
      }
    });

    Object.keys(gameMap1).forEach((gameId) => {
      if (gameMap2[gameId]) {
        const pick1 = gameMap1[gameId];
        const pick2 = gameMap2[gameId];

        if (pick1.gameId && pick2.gameId) {
          headToHead.push({
            week: pick1.gameId.week,
            game: `${pick1.gameId.awayTeam} @ ${pick1.gameId.homeTeam}`,
            user1Pick: pick1.selectedTeam,
            user2Pick: pick2.selectedTeam,
            winner: pick1.gameId.winner,
            user1Correct: pick1.isCorrect,
            user2Correct: pick2.isCorrect,
          });
        }
      }
    });

    res.json({
      season,
      user1: {
        id: userId1,
        name: user1.name,
        email: user1.email,
        stats: stats1,
      },
      user2: {
        id: userId2,
        name: user2.name,
        email: user2.email,
        stats: stats2,
      },
      headToHead,
      comparison: {
        totalPicksDifference: stats1.totalPicks - stats2.totalPicks,
        winPercentageDifference: stats1.winPercentage - stats2.winPercentage,
        correctPicksDifference: stats1.correctPicks - stats2.correctPicks,
      },
    });
  } catch (error) {
    console.error("Compare users error:", error);
    res.status(500).json({ message: "Server error comparing users" });
  }
});

// @route   POST /api/stats/calculate-weekly-winners
// @desc    Calculate weekly winners and update user stats (Admin only)
// @access  Private (Admin)
router.post("/calculate-weekly-winners", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { week, season } = req.body;
    const currentSeason = season || new Date().getFullYear();
    const currentWeek = week || 1;

    // Get all picks for this week
    const picks = await Pick.find({ week: currentWeek, season: currentSeason })
      .populate("userId", "name email")
      .populate("gameId", "awayTeam homeTeam winner status");

    if (picks.length === 0) {
      return res.status(400).json({ message: "No picks found for this week" });
    }

    // Group picks by user
    const userPicks = {};
    picks.forEach((pick) => {
      const userId = pick.userId._id.toString();
      if (!userPicks[userId]) {
        userPicks[userId] = {
          userId: pick.userId._id,
          name: pick.userId.name,
          email: pick.userId.email,
          picks: [],
          correctPicks: 0,
          totalPicks: 0,
          mondayNightScore: null,
        };
      }

      userPicks[userId].picks.push(pick);
      userPicks[userId].totalPicks++;

      if (pick.isCorrect === true) {
        userPicks[userId].correctPicks++;
      }

      // Get Monday night score if available
      if (pick.gameId.isMondayNight && pick.mondayNightScore !== null) {
        userPicks[userId].mondayNightScore = pick.mondayNightScore;
      }
    });

    // Convert to array and sort by correct picks
    const userStats = Object.values(userPicks).sort((a, b) => {
      if (b.correctPicks !== a.correctPicks) {
        return b.correctPicks - a.correctPicks;
      }

      // If tied, use Monday night score tiebreaker
      if (a.mondayNightScore !== null && b.mondayNightScore !== null) {
        // Get the actual Monday night game score
        const mondayGame = picks.find((p) => p.gameId.isMondayNight);
        if (mondayGame && mondayGame.gameId.winner) {
          const actualScore =
            mondayGame.gameId.awayScore + mondayGame.gameId.homeScore;
          const aDiff = Math.abs(a.mondayNightScore - actualScore);
          const bDiff = Math.abs(b.mondayNightScore - actualScore);
          return aDiff - bDiff; // Lower difference wins
        }
      }

      // If still tied, sort by name
      return a.name.localeCompare(b.name);
    });

    // Determine winners (all users with the highest score)
    const maxScore = userStats[0].correctPicks;
    const weeklyWinners = userStats.filter(
      (user) => user.correctPicks === maxScore
    );

    // Update weekly win counts for winners
    const winnerIds = weeklyWinners.map((winner) => winner.userId);
    await User.updateMany(
      { _id: { $in: winnerIds } },
      { $inc: { weeklyWins: 1 } }
    );

    // Update best week scores for all users
    for (const user of userStats) {
      await User.findByIdAndUpdate(user.userId, {
        $max: { bestWeekScore: user.correctPicks },
      });
    }

    res.json({
      message: "Weekly winners calculated successfully",
      week: currentWeek,
      season: currentSeason,
      weeklyWinners,
      allUserStats: userStats,
      maxScore,
    });
  } catch (error) {
    console.error("Calculate weekly winners error:", error);
    res
      .status(500)
      .json({ message: "Server error calculating weekly winners" });
  }
});

module.exports = router;
