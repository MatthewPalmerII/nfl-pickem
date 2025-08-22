const mongoose = require("mongoose");

const gameResultSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      unique: true,
    },
    awayTeam: {
      type: String,
      required: true,
    },
    homeTeam: {
      type: String,
      required: true,
    },
    awayScore: {
      type: Number,
      default: null,
    },
    homeScore: {
      type: Number,
      default: null,
    },
    finalScore: {
      type: String,
      default: null, // e.g., "24-17"
    },
    winner: {
      type: String,
      default: null, // awayTeam or homeTeam
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "final", "postponed", "cancelled"],
      default: "scheduled",
    },
    quarter: {
      type: String,
      default: null, // "1", "2", "3", "4", "OT", "Final"
    },
    timeRemaining: {
      type: String,
      default: null, // "12:34", "0:00", etc.
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    espnGameId: {
      type: String,
      default: null, // ESPN's internal game ID for API calls
    },
    processed: {
      type: Boolean,
      default: false, // Whether we've processed results for scoring
    },
    processedAt: {
      type: Date,
      default: null,
    },
    scoreOverride: {
      overriddenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      overriddenAt: {
        type: Date,
        default: null,
      },
      reason: {
        type: String,
        default: null,
      },
      previousAwayScore: {
        type: Number,
        default: null,
      },
      previousHomeScore: {
        type: Number,
        default: null,
      },
      previousStatus: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
gameResultSchema.index({ gameId: 1 });
gameResultSchema.index({ status: 1 });
gameResultSchema.index({ processed: 1 });
gameResultSchema.index({ espnGameId: 1 });

module.exports = mongoose.model("GameResult", gameResultSchema);
