const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
  {
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
    awayTeam: {
      type: String,
      required: [true, "Away team is required"],
      trim: true,
    },
    homeTeam: {
      type: String,
      required: [true, "Home team is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Game date is required"],
    },
    time: {
      type: String,
      required: [true, "Game time is required"],
      trim: true,
    },
    network: {
      type: String,
      trim: true,
      default: "TBD",
    },
    awayRecord: {
      type: String,
      default: "0-0",
    },
    homeRecord: {
      type: String,
      default: "0-0",
    },
    awayScore: {
      type: Number,
      default: null,
    },
    homeScore: {
      type: Number,
      default: null,
    },
    winner: {
      type: String,
      enum: [null, "away", "home"],
      default: null,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "final", "postponed", "cancelled"],
      default: "scheduled",
    },
    quarter: {
      type: String,
      default: null,
    },
    timeRemaining: {
      type: String,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockTime: {
      type: Date,
      required: true,
      default: function () {
        // Lock 1 hour before game time
        return new Date(this.date.getTime() - 60 * 60 * 1000);
      },
    },
    isMondayNight: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    venue: {
      type: String,
      trim: true,
    },
    isInternational: {
      type: Boolean,
      default: false,
    },
    venueName: {
      type: String,
      trim: true,
    },
    venueCity: {
      type: String,
      trim: true,
    },
    venueState: {
      type: String,
      trim: true,
    },
    venueCountry: {
      type: String,
      trim: true,
    },
    spread: {
      type: String,
      default: null, // e.g., "-3.5" or "+7"
    },
    overUnder: {
      type: String,
      default: null, // e.g., "45.5"
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
gameSchema.index({ week: 1, date: 1 });
gameSchema.index({ season: 1, week: 1 });
gameSchema.index({ status: 1 });

// Virtual for game display name
gameSchema.virtual("displayName").get(function () {
  return `${this.awayTeam} @ ${this.homeTeam}`;
});

// Virtual for checking if game is locked
gameSchema.virtual("isGameLocked").get(function () {
  if (this.isLocked) return true;
  if (this.lockTime && new Date() > this.lockTime) return true;
  return false;
});

// Method to get game result
gameSchema.methods.getResult = function () {
  if (!this.winner || this.status !== "final") return null;

  return {
    winner: this.winner === "away" ? this.awayTeam : this.homeTeam,
    loser: this.winner === "away" ? this.homeTeam : this.awayTeam,
    awayScore: this.awayScore,
    homeScore: this.homeScore,
  };
};

// Method to check if picks can still be made
gameSchema.methods.canMakePicks = function () {
  return !this.isGameLocked && this.status === "scheduled";
};

// Ensure virtual fields are serialized
gameSchema.set("toJSON", { virtuals: true });
gameSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Game", gameSchema);
