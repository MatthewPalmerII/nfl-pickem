const mongoose = require("mongoose");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");
const Pick = require("../models/Pick");
const User = require("../models/User");
const scoringService = require("../services/scoringService");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

async function testScoringSystem() {
  try {
    console.log("🧪 Starting scoring system test...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Step 1: Create test games with historical data
    console.log("\n📝 Creating test games with historical scores...");

    const testGames = [
      {
        awayTeam: "Chiefs",
        homeTeam: "Lions",
        week: 1,
        season: 2024,
        date: new Date("2024-09-05T20:20:00Z"),
        time: "8:20 PM",
        network: "NBC",
        venue: "Arrowhead Stadium",
      },
      {
        awayTeam: "Packers",
        homeTeam: "Bears",
        week: 1,
        season: 2024,
        date: new Date("2024-09-08T17:00:00Z"),
        time: "4:25 PM",
        network: "FOX",
        venue: "Lambeau Field",
      },
      {
        awayTeam: "Cowboys",
        homeTeam: "Giants",
        week: 1,
        season: 2024,
        date: new Date("2024-09-08T20:20:00Z"),
        time: "8:20 PM",
        network: "NBC",
        venue: "MetLife Stadium",
      },
    ];

    // Create games in database
    const createdGames = [];
    for (const gameData of testGames) {
      const game = new Game(gameData);
      await game.save();
      createdGames.push(game);
      console.log(`✅ Created game: ${game.awayTeam} @ ${game.homeTeam}`);
    }

    // Step 2: Create test users with picks
    console.log("\n👥 Creating test users with picks...");

    const testUsers = [
      {
        name: "Test User 1",
        email: "test1@example.com",
        password: "password123",
      },
      {
        name: "Test User 2",
        email: "test2@example.com",
        password: "password123",
      },
      {
        name: "Test User 3",
        email: "test3@example.com",
        password: "password123",
      },
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.name}`);
    }

    // Step 3: Create test picks
    console.log("\n🎯 Creating test picks...");

    const testPicks = [
      // User 1 picks
      {
        userId: createdUsers[0]._id,
        gameId: createdGames[0]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Chiefs",
      },
      {
        userId: createdUsers[0]._id,
        gameId: createdGames[1]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Packers",
      },
      {
        userId: createdUsers[0]._id,
        gameId: createdGames[2]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Cowboys",
      },

      // User 2 picks
      {
        userId: createdUsers[1]._id,
        gameId: createdGames[0]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Lions",
      },
      {
        userId: createdUsers[1]._id,
        gameId: createdGames[1]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Bears",
      },
      {
        userId: createdUsers[1]._id,
        gameId: createdGames[2]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Giants",
      },

      // User 3 picks
      {
        userId: createdUsers[2]._id,
        gameId: createdGames[0]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Chiefs",
      },
      {
        userId: createdUsers[2]._id,
        gameId: createdGames[1]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Packers",
      },
      {
        userId: createdUsers[2]._id,
        gameId: createdGames[2]._id,
        week: 1,
        season: 2024,
        selectedTeam: "Cowboys",
      },
    ];

    for (const pickData of testPicks) {
      const pick = new Pick(pickData);
      await pick.save();
      console.log(
        `✅ Created pick: ${pick.selectedTeam} for ${pickData.userId}`
      );
    }

    // Step 4: Create game results with final scores
    console.log("\n🏈 Creating game results with final scores...");

    const testResults = [
      {
        gameId: createdGames[0]._id,
        awayTeam: "Chiefs",
        homeTeam: "Lions",
        awayScore: 20,
        homeScore: 21,
        finalScore: "20-21",
        status: "final",
        processed: false,
      },
      {
        gameId: createdGames[1]._id,
        awayTeam: "Packers",
        homeTeam: "Bears",
        awayScore: 38,
        homeScore: 20,
        finalScore: "38-20",
        status: "final",
        processed: false,
      },
      {
        gameId: createdGames[2]._id,
        awayTeam: "Cowboys",
        homeTeam: "Giants",
        awayScore: 40,
        homeScore: 0,
        finalScore: "40-0",
        status: "final",
        processed: false,
      },
    ];

    for (const resultData of testResults) {
      const result = new GameResult(resultData);
      await result.save();
      console.log(
        `✅ Created result: ${result.awayTeam} ${result.awayScore} @ ${result.homeTeam} ${result.homeScore}`
      );
    }

    // Step 5: Test the scoring service
    console.log("\n🔄 Testing scoring service...");

    console.log("Processing all results...");
    await scoringService.processAllResults();

    console.log("Calculating weekly winners...");
    const weeklyResults = await scoringService.calculateWeeklyWinners(1, 2024);

    console.log("\n🏆 Weekly Results:");
    console.log(JSON.stringify(weeklyResults, null, 2));

    // Step 6: Check final standings
    console.log("\n📊 Final Standings:");
    const standings = await scoringService.getStandings();
    standings.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.name}: ${user.totalPoints} points, ${
          user.weeklyWins
        } weekly wins`
      );
    });

    // Step 7: Verify pick results
    console.log("\n🎯 Pick Results:");
    const allPicks = await Pick.find({ week: 1, season: 2024 }).populate(
      "userId",
      "name"
    );

    for (const pick of allPicks) {
      const result = pick.result;
      if (result) {
        console.log(
          `${pick.userId.name}: ${pick.selectedTeam} - ${
            result.isCorrect ? "✅ Correct" : "❌ Incorrect"
          } (${result.points} points)`
        );
      }
    }

    console.log("\n🎉 Scoring system test completed successfully!");
    console.log("\n📋 Test Summary:");
    console.log(`- Created ${createdGames.length} test games`);
    console.log(`- Created ${createdUsers.length} test users`);
    console.log(`- Created ${testPicks.length} test picks`);
    console.log(`- Created ${testResults.length} test results`);
    console.log(`- Processed all results and calculated points`);
    console.log(`- Determined weekly winners`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the test
testScoringSystem();
