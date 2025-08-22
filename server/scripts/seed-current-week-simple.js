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
    console.log("🌱 Starting simple current week seeding...");

    // Clear existing games
    await Game.deleteMany({});
    console.log("🗑️ Cleared existing games");

    // Create Week 1 games with future dates
    const currentWeek = 1;
    const season = 2025;

    // Create games for the next few days (future dates)
    const games = [
      {
        week: currentWeek,
        season,
        awayTeam: "Cowboys",
        homeTeam: "Eagles",
        date: new Date("2025-09-04T20:20:00Z"), // Future date
        time: "8:20 PM ET",
        network: "NBC",
        lockTime: new Date("2025-09-04T19:20:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Philadelphia, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Chiefs",
        homeTeam: "Chargers",
        date: new Date("2025-09-05T20:00:00Z"), // Future date
        time: "8:00 PM ET",
        network: "YouTube",
        lockTime: new Date("2025-09-05T19:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Los Angeles, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Buccaneers",
        homeTeam: "Falcons",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Atlanta, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Bengals",
        homeTeam: "Browns",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "CBS",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Cleveland, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Dolphins",
        homeTeam: "Colts",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "CBS",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Indianapolis, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Raiders",
        homeTeam: "Patriots",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Foxborough, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Cardinals",
        homeTeam: "Saints",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "New Orleans, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Steelers",
        homeTeam: "Jets",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "CBS",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "East Rutherford, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Giants",
        homeTeam: "Commanders",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Landover, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Panthers",
        homeTeam: "Jaguars",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Jacksonville, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Titans",
        homeTeam: "Broncos",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "CBS",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Denver, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "49ers",
        homeTeam: "Seahawks",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Seattle, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Lions",
        homeTeam: "Packers",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "FOX",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Green Bay, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Texans",
        homeTeam: "Rams",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "CBS",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Los Angeles, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Ravens",
        homeTeam: "Bills",
        date: new Date("2025-09-06T16:00:00Z"), // Future date
        time: "4:00 PM ET",
        network: "CBS",
        lockTime: new Date("2025-09-06T15:00:00Z"),
        isMondayNight: false,
        status: "scheduled",
        venue: "Buffalo, USA",
      },
      {
        week: currentWeek,
        season,
        awayTeam: "Vikings",
        homeTeam: "Bears",
        date: new Date("2025-09-08T20:15:00Z"), // Monday Night Football - Tiebreaker
        time: "8:15 PM ET",
        network: "ESPN",
        lockTime: new Date("2025-09-08T19:15:00Z"),
        isMondayNight: true,
        status: "scheduled",
        venue: "Chicago, USA",
      },
    ];

    // Insert games
    const insertedGames = await Game.insertMany(games);
    console.log(`✅ Created ${insertedGames.length} Week ${currentWeek} games`);

    console.log("\n📋 Created Games:");
    games.forEach((game, index) => {
      const mnf = game.isMondayNight ? " (MNF Tiebreaker)" : "";
      console.log(`   ${index + 1}. ${game.awayTeam} @ ${game.homeTeam}${mnf}`);
    });

    console.log("\n🎯 Test Login Credentials:");
    console.log("=============================");
    console.log("Email: john@example.com | Password: password123");
    console.log("Email: jane@example.com | Password: password123");
    console.log("Email: mike@example.com | Password: password123");

    console.log("\n🚀 You can now start the application with: npm run dev");
  } catch (error) {
    console.error("❌ Seeding error:", error);
  }
};

// Run the script
connectDB()
  .then(seedCurrentWeek)
  .finally(() => {
    mongoose.connection.close();
    console.log("📊 Database connection closed");
  });
