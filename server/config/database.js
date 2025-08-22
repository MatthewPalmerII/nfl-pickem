const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/nfl-pickem",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);

    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // User indexes
    await mongoose.model("User").createIndexes({ email: 1 });

    // Game indexes
    await mongoose.model("Game").createIndexes({ week: 1, date: 1 });

    // Pick indexes
    await mongoose
      .model("Pick")
      .createIndexes({ userId: 1, gameId: 1, week: 1 });
    await mongoose.model("Pick").createIndexes({ week: 1 });

    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.log("⚠️ Some indexes may already exist:", error.message);
  }
};

// Handle connection events
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("🔌 MongoDB disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("📊 MongoDB connection closed through app termination");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
});

module.exports = connectDB;
