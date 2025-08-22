const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../models/User");
const Game = require("../models/Game");

// Sample data
const sampleUsers = [
  {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    isAdmin: true,
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "password123",
    isAdmin: false,
  },
  {
    name: "Mike Johnson",
    email: "mike@example.com",
    password: "password123",
    isAdmin: false,
  },
];

const sampleGames = [
  {
    week: 1,
    season: 2024,
    awayTeam: "Kansas City Chiefs",
    homeTeam: "Baltimore Ravens",
    date: new Date("2024-09-05T20:20:00Z"),
    time: "8:20 PM",
    network: "NBC",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Green Bay Packers",
    homeTeam: "Minnesota Vikings",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Tampa Bay Buccaneers",
    homeTeam: "New Orleans Saints",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "CBS",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Tennessee Titans",
    homeTeam: "Chicago Bears",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Jacksonville Jaguars",
    homeTeam: "Miami Dolphins",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "CBS",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Atlanta Falcons",
    homeTeam: "Pittsburgh Steelers",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Indianapolis Colts",
    homeTeam: "Houston Texans",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "CBS",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Carolina Panthers",
    homeTeam: "New Orleans Saints",
    date: new Date("2024-09-08T17:00:00Z"),
    time: "1:00 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Cincinnati Bengals",
    homeTeam: "New England Patriots",
    date: new Date("2024-09-08T20:25:00Z"),
    time: "4:25 PM",
    network: "CBS",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Seattle Seahawks",
    homeTeam: "Denver Broncos",
    date: new Date("2024-09-08T20:25:00Z"),
    time: "4:25 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Los Angeles Rams",
    homeTeam: "Detroit Lions",
    date: new Date("2024-09-08T20:25:00Z"),
    time: "4:25 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Las Vegas Raiders",
    homeTeam: "Los Angeles Chargers",
    date: new Date("2024-09-08T20:25:00Z"),
    time: "4:25 PM",
    network: "CBS",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Dallas Cowboys",
    homeTeam: "Cleveland Browns",
    date: new Date("2024-09-08T20:25:00Z"),
    time: "4:25 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Washington Commanders",
    homeTeam: "New York Giants",
    date: new Date("2024-09-08T20:25:00Z"),
    time: "4:25 PM",
    network: "FOX",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
  {
    week: 1,
    season: 2024,
    awayTeam: "Buffalo Bills",
    homeTeam: "New York Jets",
    date: new Date("2024-09-09T20:15:00Z"),
    time: "8:15 PM",
    network: "ESPN",
    awayRecord: "0-0",
    homeRecord: "0-0",
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/nfl-pickem"
    );
    console.log("📊 Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Game.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Create users
    const createdUsers = await User.create(sampleUsers);
    console.log(`👥 Created ${createdUsers.length} users`);

    // Create games
    const createdGames = await Game.create(sampleGames);
    console.log(`🏈 Created ${createdGames.length} games`);

    // Display sample login credentials
    console.log("\n🎯 Sample Login Credentials:");
    console.log("=============================");
    sampleUsers.forEach((user) => {
      console.log(`Email: ${user.email} | Password: ${user.password}`);
    });

    console.log("\n✅ Database seeded successfully!");
    console.log("🚀 You can now start the application with: npm run dev");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the seeding function
seedDatabase();
