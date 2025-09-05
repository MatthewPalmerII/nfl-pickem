const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log("📊 MongoDB already connected");
      return;
    }

    console.log("🔄 Connecting to MongoDB...");
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/nfl-pickem",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferMaxEntries: 0, // Disable mongoose buffering
        bufferCommands: false, // Disable mongoose buffering
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 5, // Maintain a minimum of 5 socket connections
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      }
    );

    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);

    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.error(
      "❌ Connection string:",
      process.env.MONGODB_URI ? "Set" : "Not set"
    );
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
