const mongoose = require("mongoose");

const pickSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: [true, "Game ID is required"],
    },
    week: {
      type: Number,
      required: [true, "Week number is required"],
      min: [1, "Week must be at least 1"],
      max: [18, "Week cannot exceed 18"],
    },
    season: {
      type: Number,
      required: [true, "Season year is required"],
      default: new Date().getFullYear(),
    },
    selectedTeam: {
      type: String,
      required: [true, "Selected team is required"],
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    points: {
      type: Number,
      default: 0,
    },
    mondayNightScore: {
      type: Number,
      default: null,
      min: [0, "Score cannot be negative"],
      max: [100, "Score cannot exceed 100"],
    },
    mondayNightAwayScore: {
      type: Number,
      default: null,
      min: [0, "Score cannot be negative"],
      max: [100, "Score cannot exceed 100"],
    },
    mondayNightHomeScore: {
      type: Number,
      default: null,
      min: [0, "Score cannot be negative"],
      max: [100, "Score cannot exceed 100"],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    // Admin edit tracking
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastEditedAt: {
      type: Date,
      default: null,
    },
    editReason: {
      type: String,
      trim: true,
      default: null,
    },
    editSource: {
      type: String,
      enum: ["user_update", "admin_edit"],
      default: null,
    },
    result: {
      winner: String,
      awayScore: Number,
      homeScore: Number,
      finalScore: String,
      isCorrect: Boolean,
      points: Number,
      processedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
pickSchema.index({ userId: 1, gameId: 1, week: 1 }, { unique: true });
pickSchema.index({ userId: 1, week: 1 });
pickSchema.index({ week: 1, season: 1 });
pickSchema.index({ userId: 1, season: 1 });

// Virtual for pick status (to avoid conflict with result field)
pickSchema.virtual("pickStatus").get(function () {
  if (!this.result || this.result.isCorrect === null) return "pending";
  return this.result.isCorrect ? "correct" : "incorrect";
});

// Method to calculate points
pickSchema.methods.calculatePoints = function () {
  if (this.result && this.result.isCorrect !== null) {
    this.result.points = this.result.isCorrect ? 1 : 0;
    return this.result.points;
  }
  return 0;
};

// Method to check if pick can be modified
pickSchema.methods.canModify = function () {
  // This will be checked against the game's lock status
  return true; // Will be validated in the route
};

// Pre-save middleware to update lastModified
pickSchema.pre("save", function (next) {
  this.lastModified = new Date();
  next();
});

// Static method to get user picks for a week
pickSchema.statics.getUserPicksForWeek = function (userId, week, season) {
  return this.find({ userId, week, season })
    .populate("gameId", "awayTeam homeTeam date time network status winner")
    .sort("submittedAt");
};

// Static method to get all picks for a week
pickSchema.statics.getPicksForWeek = function (week, season) {
  return this.find({ week, season })
    .populate("userId", "name email")
    .populate("gameId", "awayTeam homeTeam winner status")
    .sort("submittedAt");
};

// Static method to get user stats
pickSchema.statics.getUserStats = function (userId, season) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), season } },
    {
      $group: {
        _id: null,
        totalPicks: { $sum: 1 },
        correctPicks: { $sum: { $cond: ["$result.isCorrect", 1, 0] } },
        totalPoints: { $sum: "$result.points" },
      },
    },
    {
      $project: {
        _id: 0,
        totalPicks: 1,
        correctPicks: 1,
        totalPoints: 1,
        winPercentage: {
          $multiply: [{ $divide: ["$correctPicks", "$totalPicks"] }, 100],
        },
      },
    },
  ]);
};

module.exports = mongoose.model("Pick", pickSchema);
