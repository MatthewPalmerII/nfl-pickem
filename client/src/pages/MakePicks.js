import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";

const MakePicks = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState({});
  const [existingPicks, setExistingPicks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deadline, setDeadline] = useState(null);

  // Format game date and time to Eastern Time
  const formatGameDateTime = (dateString, timeString) => {
    try {
      const date = new Date(dateString);

      // Convert to Eastern Time
      const easternTime = date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "long",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Extract just the time part from the timeString (e.g., "8:20 PM ET")
      const timeOnly = timeString ? timeString.replace(" ET", "") : "";

      // Format: "Thursday, 08/24/2025 at 8:20pm ET"
      const formattedDate = date.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        weekday: "long",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

      return `${formattedDate} at ${timeOnly} ET`;
    } catch (error) {
      // Fallback to original format if parsing fails
      return `${dateString} • ${timeString}`;
    }
  };

  useEffect(() => {
    fetchGames();
  }, [currentWeek]);

  const fetchGames = async () => {
    try {
      const response = await api.get(`/api/games/week/${currentWeek}`);
      setGames(response.data.games || []);
      setDeadline(response.data.deadline);

      // Load existing picks if they exist
      if (
        response.data.existingPicks &&
        response.data.existingPicks.length > 0
      ) {
        console.log("Loading existing picks:", response.data.existingPicks);

        // Store the full existingPicks array in state
        setExistingPicks(response.data.existingPicks);

        const existingPicks = {};
        response.data.existingPicks.forEach((pick) => {
          existingPicks[pick.gameId] = pick.selectedTeam;
        });

        // Load Monday Night Football scores if they exist
        // Check if any of the picks are for Monday Night Football games
        const mondayNightPick = response.data.existingPicks.find((pick) => {
          // Find the game for this pick to check if it's Monday Night Football
          const game = response.data.games.find((g) => g._id === pick.gameId);
          return game && game.isMondayNight;
        });

        console.log("Monday Night Football pick:", mondayNightPick);

        // Create picks object with both game picks and Monday Night Football scores
        let picksWithMNF = { ...existingPicks };

        if (mondayNightPick) {
          // Load the existing Monday Night Football scores
          if (
            mondayNightPick.mondayNightAwayScore !== undefined &&
            mondayNightPick.mondayNightHomeScore !== undefined
          ) {
            console.log(
              "Loading existing Monday Night Football scores:",
              `Away: ${mondayNightPick.mondayNightAwayScore}, Home: ${mondayNightPick.mondayNightHomeScore}`
            );

            picksWithMNF = {
              ...picksWithMNF,
              mondayNightAwayScore: mondayNightPick.mondayNightAwayScore,
              mondayNightHomeScore: mondayNightPick.mondayNightHomeScore,
            };
          } else if (mondayNightPick.mondayNightScore) {
            // Fallback: if only combined score exists, split it (for backward compatibility)
            console.log(
              "Loading existing Monday Night Football combined score:",
              mondayNightPick.mondayNightScore
            );

            const totalScore = mondayNightPick.mondayNightScore;
            const halfScore = Math.floor(totalScore / 2);

            picksWithMNF = {
              ...picksWithMNF,
              mondayNightAwayScore: halfScore,
              mondayNightHomeScore: totalScore - halfScore,
            };
          }
        }

        setPicks(picksWithMNF);
      } else {
        console.log("No existing picks found");
        setExistingPicks([]);
        setPicks({});
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      toast.error("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (gameId, team) => {
    setPicks((prev) => ({
      ...prev,
      [gameId]: team,
    }));
  };

  const handleSubmit = async () => {
    const selectedGames = Object.keys(picks).filter(
      (key) => key !== "mondayNightScore"
    );
    if (selectedGames.length === 0) {
      toast.error("Please make at least one pick");
      return;
    }

    // Allow partial submissions - users can submit some games now and others later

    // Check if Monday Night Football scores are provided when needed
    const hasMondayNightGame = games.some((game) => game.isMondayNight);
    if (
      hasMondayNightGame &&
      (picks.mondayNightAwayScore === undefined ||
        picks.mondayNightHomeScore === undefined)
    ) {
      toast.error(
        "Please enter both scores for the Monday Night Football tiebreaker"
      );
      return;
    }

    setSubmitting(true);
    try {
      const picksData = Object.entries(picks)
        .filter(([key]) => !key.startsWith("mondayNight"))
        .map(([gameId, team]) => ({
          gameId,
          selectedTeam: team,
          week: currentWeek,
          mondayNightScore:
            picks.mondayNightAwayScore !== undefined &&
            picks.mondayNightHomeScore !== undefined
              ? picks.mondayNightAwayScore + picks.mondayNightHomeScore
              : null,
          mondayNightAwayScore: picks.mondayNightAwayScore || null,
          mondayNightHomeScore: picks.mondayNightHomeScore || null,
        }));

      // Check if user already has picks for this week
      const hasExistingPicks = existingPicks && existingPicks.length > 0;

      if (hasExistingPicks) {
        // Update existing picks
        await api.put("/api/picks/update", { picks: picksData });
        toast.success("Picks updated successfully!");
      } else {
        // Submit new picks
        await api.post("/api/picks/submit", { picks: picksData });
        toast.success("Picks submitted successfully!");
      }

      navigate("/dashboard");
    } catch (error) {
      const message = error.response?.data?.message || "Failed to submit picks";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isGameLocked = (gameTime) => {
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nfl-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-nfl-blue mb-4">
          Make Your Picks
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Week {currentWeek} - Choose your winners
        </p>
        {deadline && (
          <p className="text-sm text-gray-500">
            Deadline: {new Date(deadline).toLocaleString()}
          </p>
        )}
        <p className="text-sm text-gray-600 mt-2">
          💡 You can submit picks for individual games as they become available.
          Each game locks 1 hour before kickoff.
        </p>
      </div>

      {/* Week Selector */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(
            (week) => (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  currentWeek === week
                    ? "bg-nfl-blue text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {week}
              </button>
            )
          )}
        </div>
      </div>

      {/* Games */}
      {games.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">🏈</div>
          <h3 className="text-xl font-bold text-nfl-blue mb-2">
            No Games Available
          </h3>
          <p className="text-gray-600">
            There are no games scheduled for Week {currentWeek} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {games.map((game) => (
            <div key={game._id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">
                    {formatGameDateTime(game.date, game.time)}
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Away Team */}
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold">{game.awayTeam}</div>
                      <div className="text-sm text-gray-600">
                        ({game.awayRecord})
                      </div>
                      <button
                        onClick={() => handlePick(game._id, game.awayTeam)}
                        disabled={isGameLocked(game.date)}
                        className={`mt-2 px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          picks[game._id] === game.awayTeam
                            ? "bg-nfl-blue text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Pick {game.awayTeam}
                      </button>
                    </div>

                    {/* @ Symbol */}
                    <div className="text-2xl font-bold text-gray-400">@</div>

                    {/* Home Team */}
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold">{game.homeTeam}</div>
                      <div className="text-sm text-gray-600">
                        ({game.homeRecord})
                      </div>
                      <button
                        onClick={() => handlePick(game._id, game.homeTeam)}
                        disabled={isGameLocked(game.date)}
                        className={`mt-2 px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          picks[game._id] === game.homeTeam
                            ? "bg-nfl-blue text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Pick {game.homeTeam}
                      </button>
                    </div>
                  </div>

                  {/* Game Venue */}
                  {game.venue && (
                    <div className="mt-3 text-center">
                      <div className="text-sm text-blue-600 font-medium">
                        📍 {game.venue}
                      </div>
                    </div>
                  )}

                  {isGameLocked(game.date) && (
                    <div className="mt-3 text-center">
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        ⏰ Game Locked
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monday Night Football Tiebreaker */}
      {games.some((game) => game.isMondayNight) && (
        <div className="card mb-8">
          <div className="text-center">
            <h3 className="text-xl font-bold text-nfl-blue mb-4">
              🏈 Monday Night Football Tiebreaker
            </h3>
            <p className="text-gray-600 mb-4">
              Predict the final score of the Monday Night Football game. This
              will be used as a tiebreaker if multiple players have the same
              number of correct picks.
            </p>
            <div className="flex items-center justify-center space-x-4 max-w-md mx-auto">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Away Team Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={picks.mondayNightAwayScore || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nfl-blue focus:border-transparent text-center"
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 0 && value <= 100) {
                      setPicks((prev) => ({
                        ...prev,
                        mondayNightAwayScore: value,
                      }));
                    }
                  }}
                />
              </div>

              <div className="text-2xl font-bold text-gray-400 mt-6">/</div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Home Team Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={picks.mondayNightHomeScore || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nfl-blue focus:border-transparent text-center"
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 0 && value <= 100) {
                      setPicks((prev) => ({
                        ...prev,
                        mondayNightHomeScore: value,
                      }));
                    }
                  }}
                />
              </div>
            </div>

            {picks.mondayNightAwayScore !== undefined &&
              picks.mondayNightHomeScore !== undefined && (
                <div className="mt-4 text-sm text-gray-600">
                  Combined Score:{" "}
                  <span className="font-semibold text-nfl-blue">
                    {picks.mondayNightAwayScore + picks.mondayNightHomeScore}
                  </span>
                </div>
              )}

            <p className="text-sm text-gray-500 mt-2">
              Enter scores for both teams (0-100 each)
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {games.length > 0 && (
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              Object.keys(picks).filter((key) => !key.startsWith("mondayNight"))
                .length < games.length
            }
            className="btn-primary px-12 py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Selected Picks"}
          </button>

          <div className="mt-4 text-sm text-gray-600">
            {
              Object.keys(picks).filter((key) => !key.startsWith("mondayNight"))
                .length
            }{" "}
            of {games.length} games picked
            {games.some((game) => game.isMondayNight) &&
              picks.mondayNightAwayScore !== undefined &&
              picks.mondayNightHomeScore !== undefined && (
                <span className="ml-2 text-green-600">
                  • Tiebreaker: {picks.mondayNightAwayScore} /{" "}
                  {picks.mondayNightHomeScore} ={" "}
                  {picks.mondayNightAwayScore + picks.mondayNightHomeScore}
                </span>
              )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-3">
          💡 Making Picks
        </h3>
        <ul className="space-y-2 text-blue-700">
          <li>• You must pick a winner for every game in the week</li>
          <li>• Picks are locked when the game deadline passes</li>
          <li>• You can change your picks until the deadline</li>
          <li>• Check back weekly to make picks for new games</li>
        </ul>
      </div>
    </div>
  );
};

export default MakePicks;
