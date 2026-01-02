const mongoose = require("mongoose");
const axios = require("axios");
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

const fetchNFLSchedule = async () => {
  try {
    console.log("🌱 Fetching real NFL schedule from ESPN API...");

    // Determine the current season year
    const currentYear = new Date().getFullYear();
    const season = currentYear;

    console.log(`📅 Using season ${season} (current year: ${currentYear})`);

    // Clear games for the current season only
    // Preserve games from next year (season + 1) for weeks 17-18 since those are correct
    await Game.deleteMany({
      season: season,
    });
    console.log(
      `🗑️ Cleared existing games for season ${season} (preserving season ${
        season + 1
      } games for weeks 17-18)`
    );
    const createdGames = [];

    // Fetch schedule for weeks 1-18 (full NFL season)
    // For weeks 17-18, we need to check both current year and next year
    for (let week = 1; week <= 18; week++) {
      console.log(`📅 Fetching Week ${week}...`);

      // For weeks 17-18, check if they're in the next calendar year
      let seasonToFetch = season;

      try {
        // Try current season first
        let response = null;
        try {
          response = await axios.get(
            `http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&year=${season}`
          );
        } catch (err) {
          // If that fails and it's week 17-18, try next year
          if (week >= 17) {
            console.log(
              `   Trying next year (${season + 1}) for Week ${week}...`
            );
            try {
              response = await axios.get(
                `http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&year=${
                  season + 1
                }`
              );
              // Update season for these games
              seasonToFetch = season + 1;
            } catch (nextYearErr) {
              console.log(
                `   ❌ Failed to fetch Week ${week} from both ${season} and ${
                  season + 1
                }`
              );
              continue;
            }
          } else {
            throw err;
          }
        }

        if (response.data && response.data.events) {
          const games = response.data.events;
          console.log(`   Found ${games.length} games for Week ${week}`);

          // Find the latest Monday game for this week (tiebreaker)
          let latestMondayGame = null;
          let latestMondayTime = null;

          games.forEach((game) => {
            const gameDate = new Date(game.date);
            if (gameDate.getDay() === 1) {
              // Monday
              if (!latestMondayTime || gameDate > latestMondayTime) {
                latestMondayTime = gameDate;
                latestMondayGame = game;
              }
            }
          });

          games.forEach((game, index) => {
            try {
              // Debug: Log the game structure
              console.log(`   Game ${index + 1}: ${game.name || "Unknown"}`);

              // Debug: Log the actual game structure
              console.log(
                `   Game structure:`,
                JSON.stringify(
                  {
                    hasCompetitions: !!game.competitions,
                    competitionCount: game.competitions?.length || 0,
                    firstCompetition: game.competitions?.[0]
                      ? Object.keys(game.competitions[0])
                      : "none",
                    competitors: game.competitions?.[0]?.competitors
                      ? Object.keys(game.competitions[0].competitors[0] || {})
                      : "none",
                  },
                  null,
                  2
                )
              );

              // Check if game has the expected structure
              if (
                !game.competitions ||
                !game.competitions[0] ||
                !game.competitions[0].competitors
              ) {
                console.log(`   ⚠️ Game ${index + 1} missing competition data`);
                return;
              }

              // Debug: Log the actual team data to see the structure
              console.log(
                `   Team data:`,
                JSON.stringify(
                  game.competitions[0].competitors.map((team) => ({
                    name: team.team.name,
                    homeAway: team.homeAway,
                    awayAway: team.awayAway,
                    type: team.type,
                  })),
                  null,
                  2
                )
              );

              // Try different ways to find teams
              let awayTeam = game.competitions[0].competitors.find(
                (team) => team.awayAway === "true" || team.awayAway === true
              );
              let homeTeam = game.competitions[0].competitors.find(
                (team) => team.homeAway === "true" || team.homeAway === true
              );

              // If that doesn't work, try alternative properties
              if (!awayTeam || !homeTeam) {
                awayTeam = game.competitions[0].competitors.find(
                  (team) =>
                    team.homeAway === "away" || team.homeAway === "false"
                );
                homeTeam = game.competitions[0].competitors.find(
                  (team) => team.homeAway === "home" || team.homeAway === "true"
                );
              }

              // If still no luck, try by position in array (usually first is away, second is home)
              if (!awayTeam || !homeTeam) {
                if (game.competitions[0].competitors.length >= 2) {
                  awayTeam = game.competitions[0].competitors[0];
                  homeTeam = game.competitions[0].competitors[1];
                }
              }

              if (awayTeam && homeTeam) {
                const gameDate = new Date(game.date);
                const isMondayNight =
                  gameDate.getDay() === 1 && game === latestMondayGame; // Only the latest Monday game

                // Check if this is an international game
                const venue = game.competitions[0].venue;
                console.log(`   Venue data:`, JSON.stringify(venue, null, 2));

                const isInternational =
                  venue &&
                  (venue.country !== "USA" ||
                    venue.city === "London" ||
                    venue.city === "Mexico City" ||
                    venue.city === "São Paulo" ||
                    venue.city === "Toronto");

                let gameNotes = "";
                if (isMondayNight) {
                  gameNotes = "Monday Night Football - Tiebreaker Game";
                }

                // Determine the correct season for this game
                // For weeks 17-18, use the actual year of the game date (which might be next calendar year)
                // For weeks 1-16, use the current season
                const gameSeason =
                  week >= 17 && gameDate.getFullYear() > season
                    ? gameDate.getFullYear()
                    : seasonToFetch;

                const newGame = {
                  week,
                  season: gameSeason,
                  awayTeam: awayTeam.team.name,
                  homeTeam: homeTeam.team.name,
                  date: gameDate,
                  time:
                    gameDate.toLocaleTimeString("en-US", {
                      timeZone: "America/New_York",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }) + " ET",
                  network:
                    game.competitions[0].broadcasts?.[0]?.media?.shortName ||
                    "TBD",
                  lockTime: new Date(gameDate.getTime() - 60 * 60 * 1000), // 1 hour before
                  isMondayNight,
                  status: "scheduled",
                  notes: gameNotes,
                  venue: venue
                    ? `${
                        venue.address?.city || venue.address?.state || "Unknown"
                      }, ${venue.address?.country || "Unknown"}`
                    : "Unknown Location, USA",
                  isInternational,
                  venueName: venue?.fullName || null,
                  venueCity: venue?.address?.city || null,
                  venueState: venue?.address?.state || null,
                  venueCountry: venue?.address?.country || null,
                };

                createdGames.push(newGame);
                console.log(
                  `   ✅ Created game: ${awayTeam.team.name} @ ${homeTeam.team.name}`
                );
              } else {
                console.log(`   ⚠️ Missing team data for game ${index + 1}`);
                console.log(
                  `   Away: ${awayTeam ? "Found" : "Missing"}, Home: ${
                    homeTeam ? "Found" : "Missing"
                  }`
                );
              }
            } catch (gameError) {
              console.log(
                `   ⚠️ Error processing game ${index + 1}:`,
                gameError.message
              );
            }
          });
        } else {
          console.log(`   ⚠️ No events data for Week ${week}`);
          console.log(
            `   Response structure:`,
            Object.keys(response.data || {})
          );
        }
      } catch (weekError) {
        console.log(`   ❌ Error fetching Week ${week}:`, weekError.message);
      }
    }

    if (createdGames.length === 0) {
      console.log(
        "❌ No games were fetched. Falling back to hardcoded schedule..."
      );
      // Fallback to hardcoded data if API fails
      return fallbackSchedule();
    }

    // Insert all games
    const insertedGames = await Game.insertMany(createdGames);
    console.log(`✅ Created ${insertedGames.length} games from ESPN API`);

    console.log("🎉 NFL schedule fetched and seeded successfully!");
    console.log("\n📋 Created Games:");
    const weekCounts = {};
    createdGames.forEach((game) => {
      weekCounts[game.week] = (weekCounts[game.week] || 0) + 1;
    });
    Object.entries(weekCounts).forEach(([week, count]) => {
      console.log(`   Week ${week}: ${count} games`);
    });
    console.log("\n💡 No sample picks created - ready for user submissions!");
  } catch (error) {
    console.error("❌ Fetching error:", error);
    console.log("🔄 Falling back to hardcoded schedule...");
    return fallbackSchedule();
  }
};

const fallbackSchedule = async () => {
  console.log("📋 Using fallback hardcoded schedule...");

  // Simple fallback schedule
  const fallbackGames = [
    {
      week: 1,
      season: 2024,
      awayTeam: "Dallas Cowboys",
      homeTeam: "Philadelphia Eagles",
      date: new Date("2024-09-04T20:20:00Z"),
      time: "8:20 PM ET",
      network: "NBC",
      lockTime: new Date("2024-09-04T19:20:00Z"),
      isMondayNight: false,
      status: "scheduled",
      notes: "Week 1 Game 1",
    },
    {
      week: 1,
      season: 2024,
      awayTeam: "Kansas City Chiefs",
      homeTeam: "Los Angeles Chargers",
      date: new Date("2024-09-05T20:00:00Z"),
      time: "8:00 PM ET",
      network: "YouTube",
      lockTime: new Date("2024-09-05T19:00:00Z"),
      isMondayNight: false,
      status: "scheduled",
      notes: "Week 1 Game 2",
    },
  ];

  const insertedGames = await Game.insertMany(fallbackGames);
  console.log(`✅ Created ${insertedGames.length} fallback games`);
};

const createSamplePicks = async (games) => {
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

    await Pick.deleteMany({});
    await Pick.insertMany(samplePicks);
    console.log(`✅ Created ${samplePicks.length} sample picks`);
  }
};

// Run the script
connectDB()
  .then(fetchNFLSchedule)
  .finally(() => {
    mongoose.connection.close();
    console.log("📊 Database connection closed");
  });
