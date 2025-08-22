const express = require("express");
const User = require("../models/User");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Admin
router.get("/", adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort("name");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error getting users" });
  }
});

module.exports = router;
