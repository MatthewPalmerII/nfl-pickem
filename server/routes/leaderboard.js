const express = require("express");
const Pick = require("../models/Pick");
const User = require("../models/User");
const Game = require("../models/Game");

const router = express.Router();

// @route   GET /api/leaderboard/overall
// @desc    Get overall season leaderboard
// @access  Public
router.get("/overall", async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const limit = parseInt(req.query.limit) || 100;

    // Aggregate picks to get user statistics
    // NFL seasons span two calendar years (e.g., 2025 season = Sept 2025 - Jan 2026)
    // Check current season, next year, and previous year to handle season mismatches
    const leaderboard = await Pick.aggregate([
      {
        $match: {
          season: { $in: [season, season + 1, season - 1] },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalPicks: { $sum: 1 },
          correctPicks: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          totalPoints: { $sum: "$points" },
          finalizedPicks: {
            $sum: { $cond: [{ $ne: ["$isCorrect", null] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          winPercentage: {
            $cond: [
              { $gt: ["$finalizedPicks", 0] },
              {
                $multiply: [
                  { $divide: ["$correctPicks", "$finalizedPicks"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalPoints: -1, winPercentage: -1, totalPicks: -1 } },
      { $limit: limit },
    ]);

    // Debug: Check what we got from aggregation
    console.log(
      `📊 Leaderboard: Aggregation returned ${leaderboard.length} users`
    );
    if (leaderboard.length > 0) {
      console.log(`📊 Sample user: ${JSON.stringify(leaderboard[0], null, 2)}`);
    }

    // Get user details and calculate streaks
    const leaderboardWithDetails = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await User.findById(entry._id).select(
          "name email joinDate lastLogin weeklyWins bestWeekScore"
        );
        if (!user) return null;

        // Calculate streaks
        // Check current season, next year, and previous year to handle season mismatches
        const userPicks = await Pick.find({
          userId: entry._id,
          season: { $in: [season, season + 1, season - 1] },
        })
          .populate("gameId", "week")
          .sort({ "gameId.week": 1, submittedAt: 1 });

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        // Sort picks by week and submission time
        const sortedPicks = userPicks
          .filter((pick) => pick.isCorrect !== null && pick.gameId)
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

        return {
          _id: entry._id,
          name: user.name,
          email: user.email,
          totalPicks: entry.totalPicks,
          correctPicks: entry.correctPicks,
          totalPoints: entry.totalPoints,
          winPercentage: Math.round(entry.winPercentage),
          currentStreak,
          bestStreak,
          weeklyWins: user.weeklyWins || 0,
          bestWeekScore: user.bestWeekScore || 0,
          joinDate: user.joinDate,
          lastLogin: user.lastLogin,
        };
      })
    );

    // Filter out null entries and add rank
    const finalLeaderboard = leaderboardWithDetails
      .filter((entry) => entry !== null)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    res.json({
      leaderboard: finalLeaderboard,
      season,
      totalPlayers: finalLeaderboard.length,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Get overall leaderboard error:", error);
    res
      .status(500)
      .json({ message: "Server error getting overall leaderboard" });
  }
});

// @route   GET /api/leaderboard/week/:week
// @desc    Get weekly leaderboard
// @access  Public
router.get("/week/:week", async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = parseInt(req.query.season) || new Date().getFullYear();

    if (week < 1 || week > 18) {
      return res.status(400).json({ message: "Invalid week number" });
    }

    // Get all picks for this week
    // For weeks 17-18, also check next year (late season games in January)
    const seasonQuery =
      week >= 17
        ? {
            $or: [
              { week, season },
              { week, season: season + 1 },
            ],
          }
        : { week, season };
    const picks = await Pick.find(seasonQuery)
      .populate("userId", "name email")
      .populate("gameId", "awayTeam homeTeam winner status");

    // Get games for this week
    const games = await Game.find(seasonQuery);

    if (games.length === 0) {
      return res.json({
        leaderboard: [],
        week,
        season,
        totalGames: 0,
        totalPlayers: 0,
      });
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
          points: 0,
        };
      }

      userPicks[userId].picks.push(pick);
      userPicks[userId].totalPicks++;

      if (pick.isCorrect === true) {
        userPicks[userId].correctPicks++;
        userPicks[userId].points++;
      }
    });

    // Convert to array and sort by points
    const leaderboard = Object.values(userPicks)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.correctPicks !== a.correctPicks)
          return b.correctPicks - a.correctPicks;
        return a.name.localeCompare(b.name);
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        winPercentage:
          entry.totalPicks > 0
            ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
            : 0,
      }));

    res.json({
      leaderboard,
      week,
      season,
      totalGames: games.length,
      totalPlayers: leaderboard.length,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Get weekly leaderboard error:", error);
    res
      .status(500)
      .json({ message: "Server error getting weekly leaderboard" });
  }
});

// @route   GET /api/leaderboard/user/:userId
// @desc    Get detailed stats for a specific user
// @access  Public
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const season = parseInt(req.query.season) || new Date().getFullYear();

    // Get user info
    const user = await User.findById(userId).select(
      "name email joinDate lastLogin"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's picks for the season
    // Check current season, next year, and previous year to handle season mismatches
    const picks = await Pick.find({
      userId,
      season: { $in: [season, season + 1, season - 1] },
    }).populate("gameId", "week awayTeam homeTeam winner status date");

    // Calculate overall stats
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

    // Calculate weekly breakdown
    const weeklyStats = {};
    for (let week = 1; week <= 18; week++) {
      const weekPicks = picks.filter((p) => p.gameId && p.gameId.week === week);
      if (weekPicks.length > 0) {
        const weekCorrect = weekPicks.filter(
          (p) => p.isCorrect === true
        ).length;
        weeklyStats[week] = {
          picks: weekPicks.length,
          correct: weekCorrect,
          percentage: Math.round((weekCorrect / weekPicks.length) * 100),
          points: weekCorrect,
        };
      }
    }

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const sortedPicks = picks
      .filter((pick) => pick.isCorrect !== null && pick.gameId)
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

    currentStreak = tempStreak;

    // Get user's rank
    // Check current season, next year, and previous year to handle season mismatches
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
      (user) => user._id.toString() === userId
    );
    const rank = userRankIndex >= 0 ? userRankIndex + 1 : 0;

    // Get total players
    const totalPlayers = await User.countDocuments({ active: true });

    res.json({
      user: {
        _id: userId,
        name: user.name,
        email: user.email,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
      },
      stats: {
        totalPicks,
        correctPicks,
        winPercentage,
        currentStreak,
        bestStreak,
        rank,
        totalPlayers,
      },
      weeklyBreakdown: weeklyStats,
      season,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Get user leaderboard stats error:", error);
    res
      .status(500)
      .json({ message: "Server error getting user leaderboard stats" });
  }
});

// @route   GET /api/leaderboard/top-performers
// @desc    Get top performers for the season
// @access  Public
router.get("/top-performers", async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const limit = parseInt(req.query.limit) || 10;

    // Get top performers by points
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
      {
        $addFields: {
          winPercentage: {
            $cond: [
              { $gt: ["$totalPicks", 0] },
              {
                $multiply: [{ $divide: ["$correctPicks", "$totalPicks"] }, 100],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalPoints: -1, winPercentage: -1 } },
      { $limit: limit },
    ]);

    // Get user details
    const topPerformersWithDetails = await Promise.all(
      topPerformers.map(async (performer, index) => {
        const user = await User.findById(performer._id).select("name email");
        if (!user) return null;

        return {
          rank: index + 1,
          _id: performer._id,
          name: user.name,
          email: user.email,
          totalPoints: performer.totalPoints,
          totalPicks: performer.totalPicks,
          correctPicks: performer.correctPicks,
          winPercentage: Math.round(performer.winPercentage),
        };
      })
    );

    // Filter out null entries
    const finalTopPerformers = topPerformersWithDetails.filter(
      (entry) => entry !== null
    );

    res.json({
      topPerformers: finalTopPerformers,
      season,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Get top performers error:", error);
    res.status(500).json({ message: "Server error getting top performers" });
  }
});

// @route   GET /api/leaderboard/streaks
// @desc    Get users with best streaks
// @access  Public
router.get("/streaks", async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const limit = parseInt(req.query.limit) || 10;

    // Get all users with picks (check multiple seasons)
    const usersWithPicks = await Pick.distinct("userId", {
      season: { $in: [season, season + 1, season - 1] },
    });

    const streakData = await Promise.all(
      usersWithPicks.map(async (userId) => {
        // Check current season, next year, and previous year to handle season mismatches
        const picks = await Pick.find({
          userId,
          season: { $in: [season, season + 1, season - 1] },
        })
          .populate("gameId", "week")
          .sort({ "gameId.week": 1, submittedAt: 1 });

        let bestStreak = 0;
        let tempStreak = 0;

        const sortedPicks = picks
          .filter((pick) => pick.isCorrect !== null && pick.gameId)
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

        return { userId, bestStreak };
      })
    );

    // Sort by best streak and get top performers
    const topStreaks = streakData
      .sort((a, b) => b.bestStreak - a.bestStreak)
      .slice(0, limit);

    // Get user details
    const topStreaksWithDetails = await Promise.all(
      topStreaks.map(async (entry, index) => {
        const user = await User.findById(entry.userId).select("name email");
        if (!user) return null;

        return {
          rank: index + 1,
          _id: entry.userId,
          name: user.name,
          email: user.email,
          bestStreak: entry.bestStreak,
        };
      })
    );

    // Filter out null entries
    const finalTopStreaks = topStreaksWithDetails.filter(
      (entry) => entry !== null
    );

    res.json({
      topStreaks: finalTopStreaks,
      season,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Get streaks leaderboard error:", error);
    res
      .status(500)
      .json({ message: "Server error getting streaks leaderboard" });
  }
});

// @route   GET /api/leaderboard/weekly-wins
// @desc    Get leaderboard sorted by weekly wins
// @access  Public
router.get("/weekly-wins", async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();
    const limit = parseInt(req.query.limit) || 50;

    // Get all users with their weekly wins
    const users = await User.find({ active: true })
      .select("name email weeklyWins bestWeekScore joinDate lastLogin")
      .sort({ weeklyWins: -1, bestWeekScore: -1, name: 1 })
      .limit(limit);

    // Get total picks and correct picks for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Include picks from next year for weeks 17-18 (late season games in January)
        const picks = await Pick.find({
          userId: user._id,
          $or: [{ season }, { season: season + 1, week: { $gte: 17 } }],
        });
        const totalPicks = picks.length;
        const correctPicks = picks.filter(
          (pick) => pick.isCorrect === true
        ).length;
        const winPercentage =
          totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          weeklyWins: user.weeklyWins || 0,
          bestWeekScore: user.bestWeekScore || 0,
          totalPicks,
          correctPicks,
          winPercentage,
          joinDate: user.joinDate,
          lastLogin: user.lastLogin,
        };
      })
    );

    // Add ranks
    const leaderboardWithRanks = usersWithStats.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json({
      leaderboard: leaderboardWithRanks,
      season,
      totalPlayers: leaderboardWithRanks.length,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Get weekly wins leaderboard error:", error);
    res
      .status(500)
      .json({ message: "Server error getting weekly wins leaderboard" });
  }
});

module.exports = router;
