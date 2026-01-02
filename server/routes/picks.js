const express = require("express");
const { body, validationResult } = require("express-validator");
const Pick = require("../models/Pick");
const Game = require("../models/Game");
const GameResult = require("../models/GameResult");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { auth, adminAuth } = require("../middleware/auth");
const {
  logPickSubmission,
  logPickUpdate,
  logAdminEdit,
  logAdminCreatedPick,
  logAdminScoreOverride,
} = require("../utils/activityLogger");

const router = express.Router();

// @route   POST /api/picks/submit
// @desc    Submit picks for a week
// @access  Private
router.post(
  "/submit",
  [
    auth,
    body("picks").isArray({ min: 1 }).withMessage("Picks array is required"),
    body("picks.*.gameId").isMongoId().withMessage("Valid game ID is required"),
    body("picks.*.selectedTeam")
      .trim()
      .notEmpty()
      .withMessage("Selected team is required"),
    body("picks.*.week")
      .isInt({ min: 1, max: 18 })
      .withMessage("Valid week number is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { picks } = req.body;

      // Validate that all picks are for the same week
      const week = picks[0].week;
      if (!picks.every((pick) => pick.week === week)) {
        return res
          .status(400)
          .json({ message: "All picks must be for the same week" });
      }

      // Determine season from the games being picked (NFL season spans two calendar years)
      // First, try to find games for this week - check current year and next year
      const currentYear = new Date().getFullYear();
      let games = await Game.find({ week, season: currentYear });
      let season = currentYear;

      // If no games found in current year, check next year (for weeks 17-18 which are in January)
      if (games.length === 0) {
        games = await Game.find({ week, season: currentYear + 1 });
        if (games.length > 0) {
          season = currentYear + 1;
        }
      }

      // If still no games, try previous year (for edge cases)
      if (games.length === 0) {
        games = await Game.find({ week, season: currentYear - 1 });
        if (games.length > 0) {
          season = currentYear - 1;
        }
      }

      if (games.length === 0) {
        return res
          .status(400)
          .json({ message: "No games found for this week" });
      }

      // Allow partial picks - users can submit some games now and others later
      // We'll validate each individual pick against lock times

      // Validate that all game IDs are valid and for the correct week
      const gameIds = games.map((g) => g._id.toString());
      const pickGameIds = picks.map((p) => p.gameId);

      if (!pickGameIds.every((id) => gameIds.includes(id))) {
        return res
          .status(400)
          .json({ message: "Invalid game ID or game not in this week" });
      }

      // Check if any of the specific games being picked are locked
      const lockedPicks = picks.filter((pick) => {
        const game = games.find((g) => g._id.toString() === pick.gameId);
        if (!game) return false;

        // Check if game is locked (1 hour before kickoff)
        const now = new Date();
        const lockTime = new Date(game.date.getTime() - 60 * 60 * 1000);
        return now > lockTime;
      });

      if (lockedPicks.length > 0) {
        return res.status(400).json({
          message: `Cannot make picks for locked games: ${lockedPicks
            .map((pick) => {
              const game = games.find((g) => g._id.toString() === pick.gameId);
              return game
                ? game.displayName || `${game.awayTeam} @ ${game.homeTeam}`
                : "Unknown game";
            })
            .join(", ")}`,
        });
      }

      // Check for existing picks and filter out any that would be duplicates
      const existingPicks = await Pick.find({
        userId: req.user._id,
        week,
        season,
      });

      // Filter out picks that already exist to avoid duplicates
      const newPicks = picks.filter((pick) => {
        return !existingPicks.some(
          (existing) => existing.gameId.toString() === pick.gameId
        );
      });

      if (newPicks.length === 0) {
        return res.status(400).json({
          message:
            "All the games you're trying to pick already have picks submitted",
        });
      }

      // Use only the new picks that don't already exist
      const picksToProcess = newPicks;

      // Create picks
      const picksToSave = picksToProcess.map((pick) => ({
        userId: req.user._id,
        gameId: pick.gameId,
        week: pick.week,
        season,
        selectedTeam: pick.selectedTeam,
        mondayNightScore: pick.mondayNightScore || null,
        mondayNightAwayScore: pick.mondayNightAwayScore || null,
        mondayNightHomeScore: pick.mondayNightHomeScore || null,
      }));

      await Pick.insertMany(picksToSave);

      // Log the pick submission activity
      await logPickSubmission(
        req.user._id,
        week,
        season,
        picksToSave.map((p) => p.gameId),
        picks.length
      );

      res.status(201).json({
        message:
          existingPicks.length > 0
            ? `Added ${picksToProcess.length} new picks (${existingPicks.length} already existed)`
            : "Picks submitted successfully",
        picksCount: picksToProcess.length,
        totalPicksForWeek: existingPicks.length + picksToProcess.length,
      });
    } catch (error) {
      console.error("Submit picks error:", error);
      res.status(500).json({ message: "Server error submitting picks" });
    }
  }
);

// @route   PUT /api/picks/update
// @desc    Update existing picks for a week
// @access  Private
router.put(
  "/update",
  [
    auth,
    body("picks").isArray({ min: 1 }).withMessage("Picks array is required"),
    body("picks.*.gameId").isMongoId().withMessage("Valid game ID is required"),
    body("picks.*.selectedTeam")
      .trim()
      .notEmpty()
      .withMessage("Selected team is required"),
    body("picks.*.week")
      .isInt({ min: 1, max: 18 })
      .withMessage("Valid week number is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { picks } = req.body;
      const week = picks[0].week;

      // Determine season from the games being updated (NFL season spans two calendar years)
      const currentYear = new Date().getFullYear();
      let games = await Game.find({
        _id: { $in: picks.map((p) => p.gameId) },
        week,
      });

      // Determine season from the games found
      let season = currentYear;
      if (games.length > 0) {
        season = games[0].season;
      } else {
        // Fallback: try to find any games for this week
        const weekGames = await Game.find({ week, season: currentYear });
        if (weekGames.length === 0) {
          const nextYearGames = await Game.find({
            week,
            season: currentYear + 1,
          });
          if (nextYearGames.length > 0) {
            season = currentYear + 1;
          }
        }
      }

      // Validate that all picks are for the same week
      if (!picks.every((pick) => pick.week === week)) {
        return res
          .status(400)
          .json({ message: "All picks must be for the same week" });
      }

      // Get existing picks for this user and week
      const existingPicks = await Pick.find({
        userId: req.user._id,
        week,
        season,
      });

      if (existingPicks.length === 0) {
        return res
          .status(400)
          .json({ message: "No existing picks found for this week" });
      }

      // Check if any games are locked
      const updateGameIds = picks.map((pick) => pick.gameId);
      const updateGames = await Game.find({ _id: { $in: updateGameIds } });

      const lockedUpdateGames = updateGames.filter((game) => {
        // Check if game is locked (1 hour before kickoff)
        const now = new Date();
        const lockTime = new Date(game.date.getTime() - 60 * 60 * 1000);
        return now > lockTime;
      });

      if (lockedUpdateGames.length > 0) {
        return res.status(400).json({
          message: `Cannot modify picks for locked games: ${lockedUpdateGames
            .map((g) => g.displayName)
            .join(", ")}`,
        });
      }

      // Update each pick, but only mark as edited if it actually changed
      for (const pick of picks) {
        const existingPick = await Pick.findOne({
          userId: req.user._id,
          gameId: pick.gameId,
          week,
          season,
        });

        if (existingPick) {
          const hasChanged =
            existingPick.selectedTeam !== pick.selectedTeam ||
            existingPick.mondayNightScore !== pick.mondayNightScore ||
            existingPick.mondayNightAwayScore !== pick.mondayNightAwayScore ||
            existingPick.mondayNightHomeScore !== pick.mondayNightHomeScore;

          if (hasChanged) {
            // Log the pick update activity
            await logPickUpdate(
              req.user._id,
              pick.gameId,
              week,
              season,
              existingPick.selectedTeam,
              pick.selectedTeam
            );

            await Pick.findOneAndUpdate(
              {
                userId: req.user._id,
                gameId: pick.gameId,
                week,
                season,
              },
              {
                selectedTeam: pick.selectedTeam,
                mondayNightScore: pick.mondayNightScore || null,
                mondayNightAwayScore: pick.mondayNightAwayScore || null,
                mondayNightHomeScore: pick.mondayNightHomeScore || null,
                lastModified: new Date(),
                // Only mark as edited if something actually changed
                lastEditedBy: req.user._id,
                lastEditedAt: new Date(),
                editSource: "user_update", // Mark this as a user update, not admin edit
                // Clear any previous admin edit fields to ensure this is treated as a user update
                editReason: null,
              }
            );
          }
        }
      }

      res.json({
        message: "Picks updated successfully",
        picksCount: picks.length,
        updatedPicks: picks.length,
      });
    } catch (error) {
      console.error("Update picks error:", error);
      res.status(500).json({ message: "Server error updating picks" });
    }
  }
);

// @route   GET /api/picks/week/:week
// @desc    Get user's picks for a specific week
// @access  Private
router.get("/week/:week", auth, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = parseInt(req.query.season) || new Date().getFullYear();

    if (week < 1 || week > 18) {
      return res.status(400).json({ message: "Invalid week number" });
    }

    const picks = await Pick.find({
      userId: req.user._id,
      week,
      season,
    }).populate(
      "gameId",
      "awayTeam homeTeam date time network status winner awayScore homeScore"
    );

    res.json({
      picks,
      week,
      season,
    });
  } catch (error) {
    console.error("Get picks error:", error);
    res.status(500).json({ message: "Server error getting picks" });
  }
});

// @route   GET /api/picks/recent
// @desc    Get user's recent picks
// @access  Private
router.get("/recent", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const season = parseInt(req.query.season) || new Date().getFullYear();

    // Check current season, next year, and previous year to handle season mismatches
    const picks = await Pick.find({
      userId: req.user._id,
      season: { $in: [season, season + 1, season - 1] },
    })
      .populate("gameId", "awayTeam homeTeam week winner status")
      .sort({ submittedAt: -1 })
      .limit(limit);

    res.json({
      picks,
      count: picks.length,
    });
  } catch (error) {
    console.error("Get recent picks error:", error);
    res.status(500).json({ message: "Server error getting recent picks" });
  }
});

// @route   GET /api/picks/user/:userId
// @desc    Get picks for a specific user (for leaderboard purposes)
// @access  Public
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const week = req.query.week ? parseInt(req.query.week) : null;
    const season = parseInt(req.query.season) || new Date().getFullYear();

    // Check current season, next year, and previous year to handle season mismatches
    const query = { userId, season: { $in: [season, season + 1, season - 1] } };
    if (week) query.week = week;

    const picks = await Pick.find(query)
      .populate("gameId", "awayTeam homeTeam week winner status")
      .sort({ week: -1, submittedAt: -1 });

    res.json({
      picks,
      count: picks.length,
    });
  } catch (error) {
    console.error("Get user picks error:", error);
    res.status(500).json({ message: "Server error getting user picks" });
  }
});

// @route   DELETE /api/picks/week/:week
// @desc    Delete user's picks for a week (if games aren't locked)
// @access  Private
router.delete("/week/:week", auth, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = parseInt(req.query.season) || new Date().getFullYear();

    if (week < 1 || week > 18) {
      return res.status(400).json({ message: "Invalid week number" });
    }

    // Get user's picks for this week
    const picks = await Pick.find({
      userId: req.user._id,
      week,
      season,
    });

    if (picks.length === 0) {
      return res.status(404).json({ message: "No picks found for this week" });
    }

    // Check if any games are locked
    const gameIds = picks.map((p) => p.gameId);
    const games = await Game.find({ _id: { $in: gameIds } });

    const lockedGames = games.filter((game) => {
      // Check if game is locked (1 hour before kickoff)
      const now = new Date();
      const lockTime = new Date(game.date.getTime() - 60 * 60 * 1000);
      return now > lockTime;
    });

    if (lockedGames.length > 0) {
      return res.status(400).json({
        message: `Cannot delete picks for locked games: ${lockedGames
          .map((g) => g.displayName)
          .join(", ")}`,
      });
    }

    // Delete picks
    await Pick.deleteMany({
      userId: req.user._id,
      week,
      season,
    });

    res.json({
      message: "Picks deleted successfully",
      deletedCount: picks.length,
    });
  } catch (error) {
    console.error("Delete picks error:", error);
    res.status(500).json({ message: "Server error deleting picks" });
  }
});

// @route   GET /api/picks/admin
// @desc    Get all picks for admin dashboard (admin only)
// @access  Admin
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const { week } = req.query;

    let query = {};
    if (week) {
      query.week = parseInt(week);
    }

    const picks = await Pick.find(query)
      .populate("userId", "name email isAdmin")
      .populate("gameId", "awayTeam homeTeam week date isMondayNight")
      .sort({ week: 1, submittedAt: -1 });

    res.json(picks);
  } catch (error) {
    console.error("Get admin picks error:", error);
    res.status(500).json({ message: "Server error getting admin picks" });
  }
});

// @route   POST /api/picks/admin-create
// @desc    Admin create a pick on behalf of a user
// @access  Admin only
router.post("/admin-create", adminAuth, async (req, res) => {
  try {
    const { userId, gameId, week, season, selectedTeam, editReason } = req.body;

    // Validate required fields
    if (!userId || !gameId || !week || !season || !selectedTeam) {
      return res.status(400).json({
        message:
          "Missing required fields: userId, gameId, week, season, selectedTeam",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Check if pick already exists
    const existingPick = await Pick.findOne({
      userId,
      gameId,
      week,
      season,
    });

    if (existingPick) {
      return res.status(400).json({
        message: "Pick already exists for this user, game, week, and season",
      });
    }

    // Create the pick
    const pick = new Pick({
      userId,
      gameId,
      week,
      season,
      selectedTeam,
      lastEditedBy: req.user._id,
      lastEditedAt: new Date(),
      editReason: editReason || "Admin created pick on user's behalf",
      editSource: "admin_edit",
    });

    await pick.save();

    // Log the admin creation activity
    await logAdminCreatedPick(
      req.user._id,
      userId,
      gameId,
      week,
      season,
      selectedTeam,
      editReason || "Admin created pick on user's behalf"
    );

    // Populate user and game details for response
    await pick.populate("userId", "name email");
    await pick.populate("gameId", "awayTeam homeTeam week date");

    res.status(201).json({
      message: "Pick created successfully",
      pick,
    });
  } catch (error) {
    console.error("Admin create pick error:", error);
    res.status(500).json({ message: "Server error creating pick" });
  }
});

// @route   PUT /api/picks/:id
// @desc    Update a pick (admin only)
// @access  Admin
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedTeam } = req.body;

    if (!selectedTeam) {
      return res.status(400).json({ message: "Selected team is required" });
    }

    // Get the pick and associated game
    const pick = await Pick.findById(id);
    if (!pick) {
      return res.status(404).json({ message: "Pick not found" });
    }

    const game = await Game.findById(pick.gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Admin can edit picks regardless of lock status
    // But we'll log when editing locked games for audit purposes
    const now = new Date();
    const lockTime = new Date(game.date.getTime() - 60 * 60 * 1000);
    const isLocked = now > lockTime;

    if (isLocked) {
      console.log(
        `Admin ${req.user.email} edited locked pick for game ${game.awayTeam} @ ${game.homeTeam} (Week ${game.week})`
      );
    }

    // Log the admin edit activity
    await logAdminEdit(
      req.user._id,
      pick.userId,
      pick.gameId,
      game.week,
      new Date().getFullYear(),
      pick.selectedTeam,
      selectedTeam,
      req.body.editReason || "Admin edit"
    );

    // Update the pick
    const updatedPick = await Pick.findByIdAndUpdate(
      id,
      {
        selectedTeam,
        lastEditedBy: req.user._id,
        lastEditedAt: new Date(),
        editReason: req.body.editReason || "Admin edit",
        editSource: "admin_edit", // Mark this as an admin edit
      },
      { new: true }
    ).populate("userId", "name email");

    res.json({
      pick: updatedPick,
      gameWasLocked: isLocked,
      message: isLocked
        ? "Pick updated (game was locked)"
        : "Pick updated successfully",
    });
  } catch (error) {
    console.error("Update pick error:", error);
    res.status(500).json({ message: "Server error updating pick" });
  }
});

// @route   PUT /api/picks/admin/override-score
// @desc    Admin override game score (admin only)
// @access  Admin
router.put("/admin/override-score", adminAuth, async (req, res) => {
  try {
    const { gameId, awayScore, homeScore, reason } = req.body;

    // Validate required fields
    if (!gameId || awayScore === undefined || homeScore === undefined) {
      return res.status(400).json({
        message: "Missing required fields: gameId, awayScore, homeScore",
      });
    }

    // Validate scores are numbers
    if (typeof awayScore !== "number" || typeof homeScore !== "number") {
      return res.status(400).json({
        message: "Scores must be numbers",
      });
    }

    // Validate scores are non-negative
    if (awayScore < 0 || homeScore < 0) {
      return res.status(400).json({
        message: "Scores cannot be negative",
      });
    }

    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Find or create game result
    let gameResult = await GameResult.findOne({ gameId });

    if (!gameResult) {
      gameResult = new GameResult({
        gameId,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        espnGameId: null,
      });
    }

    // Store previous scores for logging
    const previousAwayScore = gameResult.awayScore;
    const previousHomeScore = gameResult.homeScore;
    const previousStatus = gameResult.status;

    // Update the game result
    gameResult.awayScore = awayScore;
    gameResult.homeScore = homeScore;
    gameResult.finalScore = `${awayScore}-${homeScore}`;
    gameResult.status = "final";
    gameResult.lastUpdated = new Date();
    gameResult.processed = false; // Mark for reprocessing

    // Add override metadata
    gameResult.scoreOverride = {
      overriddenBy: req.user._id,
      overriddenAt: new Date(),
      reason: reason || "Admin score override",
      previousAwayScore,
      previousHomeScore,
      previousStatus,
    };

    await gameResult.save();

    // Log the admin score override activity
    await logAdminScoreOverride(
      req.user._id,
      game.awayTeam,
      game.homeTeam,
      game.week,
      new Date().getFullYear(),
      previousAwayScore,
      previousHomeScore,
      awayScore,
      homeScore,
      reason || "Admin score override"
    );

    // Process the updated result to recalculate points
    const scoringService = require("../services/scoringService");
    await scoringService.processGameResult(gameResult);

    res.json({
      message: "Score overridden successfully",
      gameResult,
      pointsRecalculated: true,
    });
  } catch (error) {
    console.error("Admin score override error:", error);
    res.status(500).json({ message: "Server error overriding score" });
  }
});

// @route   DELETE /api/picks/:id
// @desc    Delete a pick (admin only)
// @access  Admin
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const pick = await Pick.findByIdAndDelete(id);
    if (!pick) {
      return res.status(404).json({ message: "Pick not found" });
    }

    res.json({ message: "Pick deleted successfully" });
  } catch (error) {
    console.error("Delete pick error:", error);
    res.status(500).json({ message: "Server error deleting pick" });
  }
});

// @route   GET /api/picks/week/:week/all
// @desc    Get all users' picks for a specific week (for viewing picks)
// @access  Private
router.get("/week/:week/all", auth, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = parseInt(req.query.season) || new Date().getFullYear();

    if (week < 1 || week > 18) {
      return res.status(400).json({ message: "Invalid week number" });
    }

    const picks = await Pick.find({
      week,
      season,
    })
      .populate("userId", "name email")
      .populate(
        "gameId",
        "awayTeam homeTeam date time network status winner awayScore homeScore"
      );

    res.json(picks);
  } catch (error) {
    console.error("Get all picks for week error:", error);
    res.status(500).json({ message: "Server error getting picks for week" });
  }
});

// @route   GET /api/picks/league-log
// @desc    Get league activity log
// @access  Private
router.get("/league-log", auth, async (req, res) => {
  try {
    // Get activities from the Activity collection
    const activities = await Activity.find()
      .populate("userId", "name email")
      .populate("targetUserId", "name email")
      .populate("gameId", "awayTeam homeTeam week date")
      .sort({ timestamp: -1 })
      .limit(50);

    const log = activities.map((activity) => {
      let message = "";
      let details = activity.details;

      // Add null checks for user names
      const userName = activity.userId?.name || "Unknown User";

      switch (activity.type) {
        case "pick_submission":
          message = `${userName} submitted picks for Week ${activity.week}`;
          break;
        case "pick_update":
          message = `${userName} updated their pick for Week ${activity.week}`;
          details = `Changed from ${activity.metadata.previousValue} to ${activity.metadata.newValue} for ${activity.gameId?.awayTeam} @ ${activity.gameId?.homeTeam}`;
          break;
        case "pick_edit":
          if (activity.metadata.previousValue === "No pick") {
            const targetUserName =
              activity.targetUserId?.name || "Unknown User";
            message = `${userName} created a pick for ${targetUserName}`;
            details = `Created pick for ${activity.metadata.newValue} in ${activity.gameId?.awayTeam} @ ${activity.gameId?.homeTeam}. Reason: ${activity.metadata.editReason}`;
          } else {
            const targetUserName =
              activity.targetUserId?.name || "Unknown User";
            message = `${userName} edited ${targetUserName}'s pick`;
            details = `Changed from ${activity.metadata.previousValue} to ${activity.metadata.newValue} for ${activity.gameId?.awayTeam} @ ${activity.gameId?.homeTeam}. Reason: ${activity.metadata.editReason}`;
          }
          break;
        case "pick_delete":
          message = `${userName} deleted their pick for Week ${activity.week}`;
          break;
        case "score_override":
          message = `${userName} overrode game score`;
          details = `Changed ${activity.metadata.awayTeam} @ ${activity.metadata.homeTeam} from ${activity.metadata.previousAwayScore}-${activity.metadata.previousHomeScore} to ${activity.metadata.newAwayScore}-${activity.metadata.newHomeScore}. Reason: ${activity.metadata.reason}`;
          break;
        default:
          message = "Unknown activity";
      }

      return {
        type: activity.type,
        message,
        details,
        timestamp: activity.timestamp,
        userId: activity.userId?._id || null,
        week: activity.week,
      };
    });

    // Limit to 20 entries
    const limitedLog = log.slice(0, 20);

    res.json({ log: limitedLog });
  } catch (error) {
    console.error("Get league log error:", error);
    res.status(500).json({ message: "Server error getting league log" });
  }
});

module.exports = router;
