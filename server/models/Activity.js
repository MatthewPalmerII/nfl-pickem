const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["pick_submission", "pick_update", "pick_edit", "pick_delete"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    week: {
      type: Number,
      required: true,
      min: 1,
      max: 18,
    },
    season: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    metadata: {
      previousValue: String,
      newValue: String,
      editReason: String,
      editSource: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
activitySchema.index({ timestamp: -1 });
activitySchema.index({ userId: 1, week: 1 });
activitySchema.index({ type: 1 });

module.exports = mongoose.model("Activity", activitySchema);
