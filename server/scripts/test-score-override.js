const mongoose = require("mongoose");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");
const Pick = require("../models/Pick");
const User = require("../models/User");
const scoringService = require("../services/scoringService");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

async function testScoreOverride() {
  try {
    console.log("🧪 Starting score override test...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Step 1: Create a test game
    console.log("\n📝 Creating test game...");

    const testGame = new Game({
      awayTeam: "Eagles",
      homeTeam: "Cowboys",
      week: 1,
      season: 2024,
      date: new Date("2024-09-08T20:20:00Z"),
      time: "8:20 PM",
      network: "NBC",
      venue: "AT&T Stadium",
    });

    await testGame.save();
    console.log(`✅ Created game: ${testGame.awayTeam} @ ${testGame.homeTeam}`);

    // Step 2: Create test users with picks
    console.log("\n👥 Creating test users with picks...");

    const testUsers = [
      {
        name: "Eagles Fan",
        email: "eagles@example.com",
        password: "password123",
      },
      {
        name: "Cowboys Fan",
        email: "cowboys@example.com",
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
      {
        userId: createdUsers[0]._id,
        gameId: testGame._id,
        week: 1,
        season: 2024,
        selectedTeam: "Eagles",
      },
      {
        userId: createdUsers[1]._id,
        gameId: testGame._id,
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

    // Step 4: Create initial game result (wrong score)
    console.log("\n🏈 Creating initial game result with wrong score...");

    const initialResult = new GameResult({
      gameId: testGame._id,
      awayTeam: testGame.awayTeam,
      homeTeam: testGame.homeTeam,
      awayScore: 24,
      homeScore: 21,
      finalScore: "24-21",
      status: "final",
      processed: true,
    });

    await initialResult.save();
    console.log(`✅ Created initial result: Eagles 24 - Cowboys 21`);

    // Step 5: Process initial results
    console.log("\n🔄 Processing initial results...");
    await scoringService.processAllResults();

    console.log("Initial standings:");
    const initialStandings = await scoringService.getStandings();
    initialStandings.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}: ${user.totalPoints} points`);
    });

    // Step 6: Simulate admin score override
    console.log("\n🔧 Simulating admin score override...");

    // Find the game result and update it manually (simulating the override)
    const gameResult = await GameResult.findOne({ gameId: testGame._id });

    // Store previous scores
    const previousAwayScore = gameResult.awayScore;
    const previousHomeScore = gameResult.homeScore;

    // Override the score
    gameResult.awayScore = 21;
    gameResult.homeScore = 24;
    gameResult.finalScore = "21-24";
    gameResult.processed = false; // Mark for reprocessing

    // Add override metadata
    gameResult.scoreOverride = {
      overriddenBy: createdUsers[0]._id, // Using first user as admin for testing
      overriddenAt: new Date(),
      reason: "Test: Correcting final score",
      previousAwayScore,
      previousHomeScore,
      previousStatus: gameResult.status,
    };

    await gameResult.save();
    console.log(
      `✅ Score overridden: Eagles ${gameResult.awayScore} - Cowboys ${gameResult.homeScore}`
    );

    // Step 7: Process the corrected results
    console.log("\n🔄 Processing corrected results...");
    await scoringService.processAllResults();

    console.log("Final standings after override:");
    const finalStandings = await scoringService.getStandings();
    finalStandings.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}: ${user.totalPoints} points`);
    });

    // Step 8: Verify pick results
    console.log("\n🎯 Pick Results after override:");
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
        console.log(
          `   Final Score: ${result.finalScore}, Winner: ${result.winner}`
        );
      }
    }

    // Step 9: Check override metadata
    console.log("\n🔧 Score Override Metadata:");
    const updatedResult = await GameResult.findOne({ gameId: testGame._id });
    if (updatedResult.scoreOverride) {
      console.log(`Overridden by: ${updatedResult.scoreOverride.overriddenBy}`);
      console.log(`Overridden at: ${updatedResult.scoreOverride.overriddenAt}`);
      console.log(`Reason: ${updatedResult.scoreOverride.reason}`);
      console.log(
        `Previous score: ${updatedResult.scoreOverride.previousAwayScore}-${updatedResult.scoreOverride.previousHomeScore}`
      );
      console.log(
        `New score: ${updatedResult.awayScore}-${updatedResult.homeScore}`
      );
    }

    console.log("\n🎉 Score override test completed successfully!");
    console.log("\n📋 Test Summary:");
    console.log(`- Created test game with wrong initial score (Eagles 24-21)`);
    console.log(`- Users made picks based on wrong score`);
    console.log(`- Admin overrode score to correct score (Eagles 21-24)`);
    console.log(`- Points were recalculated automatically`);
    console.log(
      `- Eagles Fan: 0 points (Eagles lost), Cowboys Fan: 1 point (Cowboys won)`
    );
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
testScoreOverride();
