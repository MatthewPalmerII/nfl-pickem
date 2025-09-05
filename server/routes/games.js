const express = require("express");
const { body, validationResult } = require("express-validator");
const Game = require("../models/Game");
const Pick = require("../models/Pick");
const { auth, adminAuth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/games/week/:week
// @desc    Get games for a specific week with user's existing picks
// @access  Private
router.get("/week/:week", auth, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = parseInt(req.query.season) || new Date().getFullYear();

    if (week < 1 || week > 18) {
      return res.status(400).json({ message: "Invalid week number" });
    }

    // Get games for the week
    const games = await Game.find({ week, season }).sort("date");

    // Get user's existing picks for this week
    const existingPicks = await Pick.find({
      userId: req.user._id,
      week,
      season,
    });

    // Create a map of existing picks
    const picksMap = {};
    existingPicks.forEach((pick) => {
      picksMap[pick.gameId.toString()] = pick.selectedTeam;
    });

    // Calculate individual game deadlines
    const gamesWithDeadlines = games.map((game) => {
      const lockTime = new Date(game.date.getTime() - 60 * 60 * 1000);
      const isLocked = new Date() > lockTime;

      return {
        ...game.toObject(),
        lockTime: lockTime.toISOString(),
        isLocked,
        canMakePicks: !isLocked,
      };
    });

    res.json({
      games: gamesWithDeadlines,
      existingPicks: existingPicks.map((pick) => ({
        gameId: pick.gameId,
        selectedTeam: pick.selectedTeam,
        mondayNightScore: pick.mondayNightScore || null,
        mondayNightAwayScore: pick.mondayNightAwayScore || null,
        mondayNightHomeScore: pick.mondayNightHomeScore || null,
      })),
      week,
      season,
    });
  } catch (error) {
    console.error("Get games error:", error);
    res.status(500).json({ message: "Server error getting games" });
  }
});

// @route   GET /api/games/current
// @desc    Get current week's games
// @access  Public
router.get("/current", async (req, res) => {
  try {
    const season = parseInt(req.query.season) || new Date().getFullYear();

    // Find the current week based on today's date
    const today = new Date();
    const currentWeek = await Game.findOne({
      season,
      date: { $gte: today },
    }).sort("date");

    if (!currentWeek) {
      // If no future games, look for the most recent week with games
      const mostRecentWeek = await Game.findOne({
        season,
      }).sort({ week: -1 });

      if (!mostRecentWeek) {
        return res.json({ currentWeek: null, games: [] });
      }

      const games = await Game.find({
        week: mostRecentWeek.week,
        season,
      }).sort("date");

      return res.json({
        currentWeek: mostRecentWeek.week,
        games,
      });
    }

    const games = await Game.find({
      week: currentWeek.week,
      season,
    }).sort("date");

    res.json({
      currentWeek: currentWeek.week,
      games,
    });
  } catch (error) {
    console.error("Get current week error:", error);
    res.status(500).json({ message: "Server error getting current week" });
  }
});

// @route   GET /api/games/:id
// @desc    Get a specific game by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Get game error:", error);
    res.status(500).json({ message: "Server error getting game" });
  }
});

// @route   POST /api/games
// @desc    Create a new game (Admin only)
// @access  Private (Admin)
router.post(
  "/",
  [
    adminAuth,
    body("week")
      .isInt({ min: 1, max: 18 })
      .withMessage("Week must be between 1 and 18"),
    body("awayTeam").trim().notEmpty().withMessage("Away team is required"),
    body("homeTeam").trim().notEmpty().withMessage("Home team is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("time").trim().notEmpty().withMessage("Game time is required"),
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

      const {
        week,
        season,
        awayTeam,
        homeTeam,
        date,
        time,
        network,
        awayRecord,
        homeRecord,
      } = req.body;

      // Check if teams are different
      if (awayTeam === homeTeam) {
        return res
          .status(400)
          .json({ message: "Away team and home team must be different" });
      }

      // Check if game already exists for this week/season
      const existingGame = await Game.findOne({
        week,
        season: season || new Date().getFullYear(),
        $or: [
          { awayTeam, homeTeam },
          { awayTeam: homeTeam, homeTeam: awayTeam },
        ],
      });

      if (existingGame) {
        return res
          .status(400)
          .json({ message: "Game already exists for this week" });
      }

      const game = new Game({
        week,
        season: season || new Date().getFullYear(),
        awayTeam,
        homeTeam,
        date,
        time,
        network: network || "TBD",
        awayRecord: awayRecord || "0-0",
        homeRecord: homeRecord || "0-0",
      });

      await game.save();

      res.status(201).json({
        message: "Game created successfully",
        game,
      });
    } catch (error) {
      console.error("Create game error:", error);
      res.status(500).json({ message: "Server error creating game" });
    }
  }
);

// @route   PUT /api/games/:id
// @desc    Update a game (Admin only)
// @access  Private (Admin)
router.put(
  "/:id",
  [
    adminAuth,
    body("awayTeam")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Away team cannot be empty"),
    body("homeTeam")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Home team cannot be empty"),
    body("date").optional().isISO8601().withMessage("Valid date is required"),
    body("time")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Game time cannot be empty"),
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

      const game = await Game.findById(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Check if game is locked (has picks)
      const hasPicks = await Pick.exists({ gameId: game._id });
      if (hasPicks) {
        return res
          .status(400)
          .json({ message: "Cannot modify game that has picks" });
      }

      const updates = req.body;
      delete updates.week; // Don't allow changing week
      delete updates.season; // Don't allow changing season

      const updatedGame = await Game.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      res.json({
        message: "Game updated successfully",
        game: updatedGame,
      });
    } catch (error) {
      console.error("Update game error:", error);
      res.status(500).json({ message: "Server error updating game" });
    }
  }
);

// @route   DELETE /api/games/:id
// @desc    Delete a game (Admin only)
// @access  Private (Admin)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Check if game has picks
    const hasPicks = await Pick.exists({ gameId: game._id });
    if (hasPicks) {
      return res
        .status(400)
        .json({ message: "Cannot delete game that has picks" });
    }

    await Game.findByIdAndDelete(req.params.id);

    res.json({
      message: "Game deleted successfully",
    });
  } catch (error) {
    console.error("Delete game error:", error);
    res.status(500).json({ message: "Server error deleting game" });
  }
});

// @route   PUT /api/games/:id/result
// @desc    Update game result (Admin only)
// @access  Private (Admin)
router.put(
  "/:id/result",
  [
    adminAuth,
    body("awayScore")
      .isInt({ min: 0 })
      .withMessage("Away score must be a non-negative integer"),
    body("homeScore")
      .isInt({ min: 0 })
      .withMessage("Home score must be a non-negative integer"),
    body("status")
      .optional()
      .isIn(["scheduled", "live", "final", "postponed", "cancelled"])
      .withMessage("Invalid status"),
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

      const { awayScore, homeScore, status } = req.body;

      const game = await Game.findById(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Determine winner
      let winner = null;
      if (awayScore !== homeScore) {
        winner = awayScore > homeScore ? "away" : "home";
      }

      const updates = {
        awayScore,
        homeScore,
        winner,
        status: status || "final",
      };

      const updatedGame = await Game.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      res.json({
        message: "Game result updated successfully",
        game: updatedGame,
      });
    } catch (error) {
      console.error("Update game result error:", error);
      res.status(500).json({ message: "Server error updating game result" });
    }
  }
);

// @route   GET /api/games
// @desc    Get all games for admin dashboard (admin only)
// @access  Admin
router.get("/", adminAuth, async (req, res) => {
  try {
    const games = await Game.find({}).sort({ week: 1, date: 1 });
    res.json(games);
  } catch (error) {
    console.error("Get all games error:", error);
    res.status(500).json({ message: "Server error getting all games" });
  }
});

module.exports = router;
