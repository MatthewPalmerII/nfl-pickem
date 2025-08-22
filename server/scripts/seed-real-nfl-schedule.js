const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../models/User");
const Game = require("../models/Game");
const Pick = require("../models/Pick");

// NFL Team Abbreviations to Full Names
const TEAM_NAMES = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

// Real NFL Schedule Data (parsed from CSV)
const NFL_SCHEDULE = {
  1: [
    { away: "ARI", home: "NO" },
    { away: "ATL", home: "TB" },
    { away: "BAL", home: "BUF" },
    { away: "CAR", home: "JAX" },
    { away: "CHI", home: "MIN" },
    { away: "CIN", home: "CLE" },
    { away: "DAL", home: "PHI" },
    { away: "DEN", home: "TEN" },
    { away: "DET", home: "GB" },
    { away: "GB", home: "DET" },
    { away: "HOU", home: "LAR" },
    { away: "IND", home: "MIA" },
    { away: "JAX", home: "CAR" },
    { away: "KC", home: "LAC" },
    { away: "LAC", home: "KC" },
    { away: "LAR", home: "HOU" },
    { away: "LV", home: "NE" },
    { away: "MIA", home: "IND" },
    { away: "MIN", home: "CHI" },
    { away: "NE", home: "LV" },
    { away: "NO", home: "ARI" },
    { away: "NYG", home: "WAS" },
    { away: "NYJ", home: "PIT" },
    { away: "PHI", home: "DAL" },
    { away: "PIT", home: "NYJ" },
    { away: "SEA", home: "SF" },
    { away: "SF", home: "SEA" },
    { away: "TB", home: "ATL" },
    { away: "TEN", home: "DEN" },
    { away: "WAS", home: "NYG" },
  ],
  2: [
    { away: "ATL", home: "MIN" },
    { away: "BAL", home: "CLE" },
    { away: "BUF", home: "NYJ" },
    { away: "CAR", home: "ARI" },
    { away: "CHI", home: "DET" },
    { away: "CIN", home: "JAX" },
    { away: "CLE", home: "BAL" },
    { away: "DAL", home: "NYG" },
    { away: "DEN", home: "IND" },
    { away: "DET", home: "CHI" },
    { away: "GB", home: "WAS" },
    { away: "HOU", home: "TB" },
    { away: "IND", home: "DEN" },
    { away: "JAX", home: "CIN" },
    { away: "KC", home: "PHI" },
    { away: "LAC", home: "LV" },
    { away: "LAR", home: "TEN" },
    { away: "LV", home: "LAC" },
    { away: "MIA", home: "NE" },
    { away: "MIN", home: "ATL" },
    { away: "NE", home: "MIA" },
    { away: "NO", home: "SF" },
    { away: "NYG", home: "DAL" },
    { away: "NYJ", home: "BUF" },
    { away: "PHI", home: "KC" },
    { away: "PIT", home: "SEA" },
    { away: "SEA", home: "PIT" },
    { away: "SF", home: "NO" },
    { away: "TB", home: "HOU" },
    { away: "TEN", home: "LAR" },
    { away: "WAS", home: "GB" },
  ],
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const seedRealNFLSchedule = async () => {
  try {
    console.log("🌱 Starting real NFL schedule seeding...");

    // Clear existing games
    await Game.deleteMany({});
    console.log("🗑️ Cleared existing games");

    const season = 2024;
    const createdGames = [];

    // Create games for each week
    for (const [week, games] of Object.entries(NFL_SCHEDULE)) {
      const weekNum = parseInt(week);
      console.log(`📅 Creating Week ${weekNum} games...`);

      for (let i = 0; i < games.length; i++) {
        const game = games[i];

        // Calculate game date (starting from September 5, 2024 for Week 1)
        const baseDate = new Date("2024-09-05T00:00:00Z");
        const gameDate = new Date(
          baseDate.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000
        );

        // Add some time variation within the week
        const dayOffset = Math.floor(i / 3); // Spread games across days
        const timeOffset = (i % 3) * 4; // Different times (1 PM, 5 PM, 9 PM ET)

        const finalGameDate = new Date(
          gameDate.getTime() +
            dayOffset * 24 * 60 * 60 * 1000 +
            timeOffset * 60 * 60 * 1000
        );

        // Determine if it's Monday Night Football (last game of the week)
        const isMondayNight = i === games.length - 1;

        // Set game time based on position
        let gameTime;
        if (isMondayNight) {
          gameTime = "8:15 PM ET";
        } else if (timeOffset === 0) {
          gameTime = "1:00 PM ET";
        } else if (timeOffset === 4) {
          gameTime = "5:00 PM ET";
        } else {
          gameTime = "9:00 PM ET";
        }

        const newGame = {
          week: weekNum,
          season,
          awayTeam: TEAM_NAMES[game.away],
          homeTeam: TEAM_NAMES[game.home],
          date: finalGameDate,
          time: gameTime,
          lockTime: new Date(finalGameDate.getTime() - 60 * 60 * 1000), // 1 hour before
          isMondayNight,
          status: "scheduled",
          notes: isMondayNight
            ? "Monday Night Football - Tiebreaker Game"
            : `Week ${weekNum} Game ${i + 1}`,
        };

        createdGames.push(newGame);
      }
    }

    // Insert all games
    const insertedGames = await Game.insertMany(createdGames);
    console.log(
      `✅ Created ${insertedGames.length} games across ${
        Object.keys(NFL_SCHEDULE).length
      } weeks`
    );

    // Create sample picks for testing
    const users = await User.find({});
    if (users.length > 0) {
      const samplePicks = [];

      for (const user of users) {
        for (const game of insertedGames) {
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

      // Clear existing picks and create new ones
      await Pick.deleteMany({});
      await Pick.insertMany(samplePicks);
      console.log(`✅ Created ${samplePicks.length} sample picks`);
    }

    console.log("🎉 Real NFL schedule seeding completed successfully!");
    console.log("\n📋 Created Games:");
    Object.keys(NFL_SCHEDULE).forEach((week) => {
      console.log(`   Week ${week}: ${NFL_SCHEDULE[week].length} games`);
    });

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
connectDB().then(seedRealNFLSchedule);
