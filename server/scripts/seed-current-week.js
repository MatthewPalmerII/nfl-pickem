const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../models/User");
const Game = require("../models/Game");
const Pick = require("../models/Pick");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const seedCurrentWeek = async () => {
  try {
    console.log("🌱 Starting current week seeding...");

    // Get current date info
    const today = new Date();
    const currentYear = today.getFullYear();

    // For testing purposes, use Week 1 (since Game model limits weeks to 1-18)
    const currentWeek = 1;

    console.log(`📅 Current date: ${today.toDateString()}`);
    console.log(
      `📅 Using Week ${currentWeek} for testing (NFL season typically starts in September)`
    );

    // Create games for the current week (starting from today)
    const currentWeekGames = [
      {
        week: currentWeek,
        season: currentYear,
        awayTeam: "Green Bay Packers",
        homeTeam: "Philadelphia Eagles",
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        time: "8:20 PM ET",
        lockTime: new Date(
          today.getTime() + 2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000
        ), // 1 hour before
        isMondayNight: false,
        status: "scheduled",
        notes: "Current Week Game 1",
      },
      {
        week: currentWeek,
        season: currentYear,
        awayTeam: "Kansas City Chiefs",
        homeTeam: "Baltimore Ravens",
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        time: "1:00 PM ET",
        lockTime: new Date(
          today.getTime() + 3 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000
        ),
        isMondayNight: false,
        status: "scheduled",
        notes: "Current Week Game 2",
      },
      {
        week: currentWeek,
        season: currentYear,
        awayTeam: "Dallas Cowboys",
        homeTeam: "Cleveland Browns",
        date: new Date(
          today.getTime() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
        ), // 3 days + 3 hours
        time: "4:25 PM ET",
        lockTime: new Date(
          today.getTime() +
            3 * 24 * 60 * 60 * 1000 +
            3 * 60 * 60 * 1000 -
            60 * 60 * 1000
        ),
        isMondayNight: false,
        status: "scheduled",
        notes: "Current Week Game 3",
      },
      {
        week: currentWeek,
        season: currentYear,
        awayTeam: "Buffalo Bills",
        homeTeam: "Miami Dolphins",
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        time: "8:15 PM ET",
        lockTime: new Date(
          today.getTime() + 4 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000
        ),
        isMondayNight: true,
        status: "scheduled",
        notes: "Monday Night Football - Tiebreaker Game",
      },
    ];

    // Clear existing games for current week
    await Game.deleteMany({ week: currentWeek, season: currentYear });
    console.log(`🗑️ Cleared existing games for Week ${currentWeek}`);

    // Create current week games
    const games = await Game.insertMany(currentWeekGames);
    console.log(`✅ Created ${games.length} games for Week ${currentWeek}`);

    // Create sample picks for testing
    const users = await User.find({});
    if (users.length > 0) {
      const samplePicks = [];

      for (const user of users) {
        for (const game of games) {
          const pick = {
            userId: user._id,
            gameId: game._id,
            week: game.week,
            season: game.season,
            selectedTeam: Math.random() > 0.5 ? game.awayTeam : game.homeTeam,
            mondayNightScore: game.isMondayNight
              ? Math.floor(Math.random() * 60) + 30
              : null,
            submittedAt: new Date(),
          };
          samplePicks.push(pick);
        }
      }

      // Clear existing picks for current week and create new ones
      await Pick.deleteMany({ week: currentWeek, season: currentYear });
      await Pick.insertMany(samplePicks);
      console.log(
        `✅ Created ${samplePicks.length} sample picks for Week ${currentWeek}`
      );
    }

    console.log("🎉 Current week seeding completed successfully!");
    console.log(`\n📋 Created ${games.length} games for Week ${currentWeek}`);
    console.log(`👥 Sample picks created for ${users.length} users`);

    console.log("\n🔗 Test URLs:");
    console.log(`   Current Week: http://localhost:5001/api/games/current`);
    console.log(
      `   Week ${currentWeek}: http://localhost:5001/api/games/week/${currentWeek}`
    );
  } catch (error) {
    console.error("❌ Seeding error:", error);
  } finally {
    mongoose.connection.close();
    console.log("📊 Database connection closed");
  }
};

// Run the seeding
connectDB().then(seedCurrentWeek);
