const mongoose = require("mongoose");
const GameResult = require("../models/GameResult");
const Game = require("../models/Game");
const Pick = require("../models/Pick");
const User = require("../models/User");
const scoringService = require("../services/scoringService");
require("dotenv").config();

// Connect to database
const connectDB = require("../config/database");

async function testLiveScoring() {
  try {
    console.log("🧪 Starting live scoring test...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Step 1: Create a test game
    console.log("\n📝 Creating test game...");

    const testGame = new Game({
      awayTeam: "Bills",
      homeTeam: "Jets",
      week: 1,
      season: 2024,
      date: new Date("2024-09-08T17:00:00Z"),
      time: "4:25 PM",
      network: "CBS",
      venue: "MetLife Stadium",
    });

    await testGame.save();
    console.log(`✅ Created game: ${testGame.awayTeam} @ ${testGame.homeTeam}`);

    // Step 2: Create test users with picks
    console.log("\n👥 Creating test users with picks...");

    const testUsers = [
      {
        name: "Bills Fan",
        email: "bills@example.com",
        password: "password123",
      },
      { name: "Jets Fan", email: "jets@example.com", password: "password123" },
      {
        name: "Neutral Fan",
        email: "neutral@example.com",
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
        selectedTeam: "Bills",
      },
      {
        userId: createdUsers[1]._id,
        gameId: testGame._id,
        week: 1,
        season: 2024,
        selectedTeam: "Jets",
      },
      {
        userId: createdUsers[2]._id,
        gameId: testGame._id,
        week: 1,
        season: 2024,
        selectedTeam: "Bills",
      },
    ];

    for (const pickData of testPicks) {
      const pick = new Pick(pickData);
      await pick.save();
      console.log(
        `✅ Created pick: ${pick.selectedTeam} for ${pickData.userId}`
      );
    }

    // Step 4: Simulate live game progression
    console.log("\n🏈 Simulating live game progression...");

    const gameStages = [
      {
        name: "1st Quarter",
        awayScore: 7,
        homeScore: 0,
        status: "live",
        quarter: "1",
        timeRemaining: "12:34",
      },
      {
        name: "2nd Quarter",
        awayScore: 14,
        homeScore: 7,
        status: "live",
        quarter: "2",
        timeRemaining: "8:45",
      },
      {
        name: "3rd Quarter",
        awayScore: 21,
        homeScore: 14,
        status: "live",
        quarter: "3",
        timeRemaining: "15:00",
      },
      {
        name: "4th Quarter",
        awayScore: 28,
        homeScore: 21,
        status: "live",
        quarter: "4",
        timeRemaining: "2:30",
      },
      {
        name: "Final",
        awayScore: 28,
        homeScore: 21,
        status: "final",
        quarter: "Final",
        timeRemaining: "0:00",
      },
    ];

    for (let i = 0; i < gameStages.length; i++) {
      const stage = gameStages[i];

      console.log(
        `\n📊 ${stage.name}: Bills ${stage.awayScore} - Jets ${stage.homeScore}`
      );

      // Create or update game result
      let gameResult = await GameResult.findOne({ gameId: testGame._id });

      if (!gameResult) {
        gameResult = new GameResult({
          gameId: testGame._id,
          awayTeam: testGame.awayTeam,
          homeTeam: testGame.homeTeam,
        });
      }

      // Update with current stage data
      gameResult.awayScore = stage.awayScore;
      gameResult.homeScore = stage.homeScore;
      gameResult.status = stage.status;
      gameResult.quarter = stage.quarter;
      gameResult.timeRemaining = stage.timeRemaining;
      gameResult.lastUpdated = new Date();

      if (stage.status === "final") {
        gameResult.finalScore = `${stage.awayScore}-${stage.homeScore}`;
      }

      await gameResult.save();
      console.log(`✅ Updated game result: ${stage.status} (${stage.quarter})`);

      // Wait 2 seconds between stages to simulate real-time updates
      if (i < gameStages.length - 1) {
        console.log("⏳ Waiting 2 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Step 5: Process final results
    console.log("\n🔄 Processing final results...");
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
        console.log(
          `   Final Score: ${result.finalScore}, Winner: ${result.winner}`
        );
      }
    }

    console.log("\n🎉 Live scoring test completed successfully!");
    console.log("\n📋 Test Summary:");
    console.log(
      `- Simulated live game progression through ${gameStages.length} stages`
    );
    console.log(`- Updated scores in real-time`);
    console.log(`- Processed final results and calculated points`);
    console.log(
      `- Bills won 28-21, so Bills picks got 1 point, Jets picks got 0 points`
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
testLiveScoring();
