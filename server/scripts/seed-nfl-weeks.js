const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../models/User");
const Game = require("../models/Game");
const Pick = require("../models/Pick");

// NFL Teams (2024 season)
const NFL_TEAMS = {
  AFC_EAST: [
    "Buffalo Bills",
    "Miami Dolphins",
    "New England Patriots",
    "New York Jets",
  ],
  AFC_NORTH: [
    "Baltimore Ravens",
    "Cincinnati Bengals",
    "Cleveland Browns",
    "Pittsburgh Steelers",
  ],
  AFC_SOUTH: [
    "Houston Texans",
    "Indianapolis Colts",
    "Jacksonville Jaguars",
    "Tennessee Titans",
  ],
  AFC_WEST: [
    "Denver Broncos",
    "Kansas City Chiefs",
    "Las Vegas Raiders",
    "Los Angeles Chargers",
  ],
  NFC_EAST: [
    "Dallas Cowboys",
    "New York Giants",
    "Philadelphia Eagles",
    "Washington Commanders",
  ],
  NFC_NORTH: [
    "Chicago Bears",
    "Detroit Lions",
    "Green Bay Packers",
    "Minnesota Vikings",
  ],
  NFC_SOUTH: [
    "Atlanta Falcons",
    "Carolina Panthers",
    "New Orleans Saints",
    "Tampa Bay Buccaneers",
  ],
  NFC_WEST: [
    "Arizona Cardinals",
    "Los Angeles Rams",
    "San Francisco 49ers",
    "Seattle Seahawks",
  ],
};

// Sample Week 1 Games (2024 season)
const WEEK_1_GAMES = [
  {
    week: 1,
    season: 2024,
    awayTeam: "Green Bay Packers",
    homeTeam: "Philadelphia Eagles",
    date: new Date("2024-09-06T20:20:00Z"), // Friday night
    time: "8:20 PM ET",
    lockTime: new Date("2024-09-06T19:20:00Z"), // 1 hour before
    isMondayNight: false,
    status: "scheduled",
    notes: "Season opener",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Kansas City Chiefs",
    homeTeam: "Baltimore Ravens",
    date: new Date("2024-09-08T17:00:00Z"), // Sunday 1 PM ET
    time: "1:00 PM ET",
    lockTime: new Date("2024-09-08T16:00:00Z"),
    isMondayNight: false,
    status: "scheduled",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Dallas Cowboys",
    homeTeam: "Cleveland Browns",
    date: new Date("2024-09-08T20:25:00Z"), // Sunday 4:25 PM ET
    time: "4:25 PM ET",
    lockTime: new Date("2024-09-08T19:25:00Z"),
    isMondayNight: false,
    status: "scheduled",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Buffalo Bills",
    homeTeam: "Miami Dolphins",
    date: new Date("2024-09-09T23:15:00Z"), // Monday Night Football
    time: "8:15 PM ET",
    lockTime: new Date("2024-09-09T22:15:00Z"),
    isMondayNight: true,
    status: "scheduled",
    notes: "Monday Night Football - Tiebreaker Game",
  },
];

// Sample Week 2 Games
const WEEK_2_GAMES = [
  {
    week: 2,
    season: 2024,
    awayTeam: "New York Jets",
    homeTeam: "Tennessee Titans",
    date: new Date("2024-09-12T20:15:00Z"), // Thursday Night
    time: "8:15 PM ET",
    lockTime: new Date("2024-09-12T19:15:00Z"),
    isMondayNight: false,
    status: "scheduled",
  },
  {
    week: 2,
    season: 2024,
    awayTeam: "San Francisco 49ers",
    homeTeam: "Los Angeles Rams",
    date: new Date("2024-09-15T17:00:00Z"), // Sunday 1 PM ET
    time: "1:00 PM ET",
    lockTime: new Date("2024-09-15T16:00:00Z"),
    isMondayNight: false,
    status: "scheduled",
  },
  {
    week: 2,
    season: 2024,
    awayTeam: "Cincinnati Bengals",
    homeTeam: "Pittsburgh Steelers",
    date: new Date("2024-09-15T20:25:00Z"), // Sunday 4:25 PM ET
    time: "4:25 PM ET",
    lockTime: new Date("2024-09-15T19:25:00Z"),
    isMondayNight: false,
    status: "scheduled",
  },
  {
    week: 2,
    season: 2024,
    awayTeam: "New Orleans Saints",
    homeTeam: "Carolina Panthers",
    date: new Date("2024-09-16T23:15:00Z"), // Monday Night Football
    time: "8:15 PM ET",
    lockTime: new Date("2024-09-16T22:15:00Z"),
    isMondayNight: true,
    status: "scheduled",
    notes: "Monday Night Football - Tiebreaker Game",
  },
];

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const seedNFLWeeks = async () => {
  try {
    console.log("🌱 Starting NFL weeks seeding...");

    // Clear existing games
    await Game.deleteMany({});
    console.log("🗑️ Cleared existing games");

    // Create Week 1 games
    const week1Games = await Game.insertMany(WEEK_1_GAMES);
    console.log(`✅ Created ${week1Games.length} Week 1 games`);

    // Create Week 2 games
    const week2Games = await Game.insertMany(WEEK_2_GAMES);
    console.log(`✅ Created ${week2Games.length} Week 2 games`);

    // Create some sample picks for testing
    const users = await User.find({});
    if (users.length > 0) {
      const samplePicks = [];

      // Create picks for Week 1
      for (const user of users) {
        for (const game of week1Games) {
          const pick = {
            userId: user._id,
            gameId: game._id,
            week: game.week,
            season: game.season,
            selectedTeam: Math.random() > 0.5 ? game.awayTeam : game.homeTeam,
            mondayNightScore: game.isMondayNight
              ? Math.floor(Math.random() * 60) + 30
              : null, // Random score 30-90
            submittedAt: new Date(),
          };
          samplePicks.push(pick);
        }
      }

      // Clear existing picks and create new ones
      await Pick.deleteMany({});
      await Pick.insertMany(samplePicks);
      console.log(`✅ Created ${samplePicks.length} sample picks`);
    }

    console.log("🎉 NFL weeks seeding completed successfully!");
    console.log("\n📋 Created Games:");
    console.log(`   Week 1: ${week1Games.length} games`);
    console.log(`   Week 2: ${week2Games.length} games`);
    console.log(`   Total: ${week1Games.length + week2Games.length} games`);

    if (users.length > 0) {
      console.log(`👥 Sample picks created for ${users.length} users`);
    }

    console.log("\n🔗 Test URLs:");
    console.log("   Current Week: http://localhost:5001/api/games/current");
    console.log("   Week 1: http://localhost:5001/api/games/week/1");
    console.log("   Week 2: http://localhost:5001/api/games/week/2");
  } catch (error) {
    console.error("❌ Seeding error:", error);
  } finally {
    mongoose.connection.close();
    console.log("📊 Database connection closed");
  }
};

// Run the seeding
connectDB().then(seedNFLWeeks);
