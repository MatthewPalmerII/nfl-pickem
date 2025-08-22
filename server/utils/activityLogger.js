const Activity = require("../models/Activity");

/**
 * Log a pick submission activity
 */
const logPickSubmission = async (userId, week, season, gameIds, picksCount) => {
  try {
    const activity = new Activity({
      type: "pick_submission",
      userId,
      targetUserId: userId,
      gameId: gameIds[0], // Use first game as reference
      week,
      season,
      action: "Submitted picks for week",
      details: `${picksCount} games selected`,
      metadata: {
        newValue: `${picksCount} picks submitted`,
      },
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging pick submission:", error);
  }
};

/**
 * Log a pick update activity (user editing their own picks)
 */
const logPickUpdate = async (
  userId,
  gameId,
  week,
  season,
  previousValue,
  newValue
) => {
  try {
    const activity = new Activity({
      type: "pick_update",
      userId,
      targetUserId: userId,
      gameId,
      week,
      season,
      action: "Updated pick",
      details: `Changed from ${previousValue} to ${newValue}`,
      metadata: {
        previousValue,
        newValue,
        editSource: "user_update",
      },
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging pick update:", error);
  }
};

/**
 * Log an admin edit activity
 */
const logAdminEdit = async (
  adminUserId,
  targetUserId,
  gameId,
  week,
  season,
  previousValue,
  newValue,
  editReason
) => {
  try {
    const activity = new Activity({
      type: "pick_edit",
      userId: adminUserId,
      targetUserId,
      gameId,
      week,
      season,
      action: "Admin edited pick",
      details: `Changed from ${previousValue} to ${newValue}`,
      metadata: {
        previousValue,
        newValue,
        editReason: editReason || "No reason provided",
        editSource: "admin_edit",
      },
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging admin edit:", error);
  }
};

/**
 * Log an admin-created pick activity
 */
const logAdminCreatedPick = async (
  adminUserId,
  targetUserId,
  gameId,
  week,
  season,
  selectedTeam,
  editReason
) => {
  try {
    const activity = new Activity({
      type: "pick_edit",
      userId: adminUserId,
      targetUserId,
      gameId,
      week,
      season,
      action: "Admin created pick",
      details: `Created pick for ${selectedTeam}`,
      metadata: {
        previousValue: "No pick",
        newValue: selectedTeam,
        editReason: editReason || "Admin created pick on user's behalf",
        editSource: "admin_edit",
      },
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging admin created pick:", error);
  }
};

/**
 * Log a pick deletion activity
 */
const logPickDelete = async (userId, gameId, week, season, deletedValue) => {
  try {
    const activity = new Activity({
      type: "pick_delete",
      userId,
      targetUserId: userId,
      gameId,
      week,
      season,
      action: "Deleted pick",
      details: `Removed pick for ${deletedValue}`,
      metadata: {
        previousValue: deletedValue,
      },
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging pick deletion:", error);
  }
};

/**
 * Log an admin score override activity
 */
const logAdminScoreOverride = async (
  adminUserId,
  awayTeam,
  homeTeam,
  week,
  season,
  previousAwayScore,
  previousHomeScore,
  newAwayScore,
  newHomeScore,
  reason
) => {
  try {
    const activity = new Activity({
      type: "score_override",
      userId: adminUserId,
      targetUserId: adminUserId, // Admin is overriding their own system
      gameId: null, // We don't have the game ID here, but we can identify by teams
      week,
      season,
      action: "Admin overrode game score",
      details: `Changed ${awayTeam} @ ${homeTeam} from ${
        previousAwayScore || "No score"
      }-${previousHomeScore || "No score"} to ${newAwayScore}-${newHomeScore}`,
      metadata: {
        awayTeam,
        homeTeam,
        previousAwayScore: previousAwayScore || "No score",
        previousHomeScore: previousHomeScore || "No score",
        newAwayScore,
        newHomeScore,
        reason: reason || "Admin score override",
        editSource: "admin_override",
      },
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging admin score override:", error);
  }
};

module.exports = {
  logPickSubmission,
  logPickUpdate,
  logAdminEdit,
  logAdminCreatedPick,
  logAdminScoreOverride,
  logPickDelete,
};
