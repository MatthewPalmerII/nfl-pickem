const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const pickRoutes = require("./routes/picks");
const statsRoutes = require("./routes/stats");
const leaderboardRoutes = require("./routes/leaderboard");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 5001;

// Log port configuration for debugging
console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔧 PORT from env: ${process.env.PORT || "not set"}`);
console.log(`🔧 Using port: ${PORT}`);

// Security middleware
app.use(helmet());

// Rate limiting - DISABLED due to X-Forwarded-For header issues
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
//   trustProxy: false, // Don't trust X-Forwarded-For header
// });
// app.use("/api/", limiter);

// CORS configuration
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Database connection
const connectDB = require("./config/database");

// Database connection check middleware
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database not connected. Please try again in a moment.",
      error: "Service temporarily unavailable",
    });
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/picks", pickRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/users", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "NFL Pick'em API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server only after database connection
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // Start the server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 NFL Pick'em server running on port ${PORT}`);
      console.log(`📱 Frontend should be running on http://localhost:3000`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
      console.log(`🌐 Server accessible from any IP`);

      // Start automated score update job
      if (
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_SCORE_UPDATES === "true"
      ) {
        const scoreUpdateJob = require("./jobs/scoreUpdateJob");
        scoreUpdateJob.start();
        console.log("🏈 Automated score update job started");
      } else {
        console.log(
          "⏸️ Score updates disabled in development (set ENABLE_SCORE_UPDATES=true to enable)"
        );
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
