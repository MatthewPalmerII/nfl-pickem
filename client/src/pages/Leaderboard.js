import React, { useState, useEffect } from "react";
import axios from "axios";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("overall"); // 'overall' or 'weekly'

  useEffect(() => {
    fetchLeaderboard();
  }, [currentWeek, viewMode]);

  const fetchLeaderboard = async () => {
    try {
      const endpoint =
        viewMode === "overall"
          ? "/api/leaderboard/overall"
          : `/api/leaderboard/week/${currentWeek}`;

      const response = await axios.get(endpoint);
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "text-yellow-600";
    if (rank === 2) return "text-gray-500";
    if (rank === 3) return "text-orange-600";
    return "text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nfl-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-nfl-blue mb-4">
          🏆 Leaderboard
        </h1>
        <p className="text-xl text-gray-600">
          See how you stack up against the competition
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode("overall")}
            className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
              viewMode === "overall"
                ? "bg-nfl-blue text-white"
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            Overall Season
          </button>
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
              viewMode === "weekly"
                ? "bg-nfl-blue text-white"
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            Weekly Results
          </button>
        </div>
      </div>

      {/* Week Selector (only for weekly view) */}
      {viewMode === "weekly" && (
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
            ].map((week) => (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  currentWeek === week
                    ? "bg-nfl-blue text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-nfl-blue text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  {viewMode === "overall" ? "Total Picks" : "Week Picks"}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  {viewMode === "overall" ? "Win %" : "Correct"}
                </th>
                {viewMode === "overall" && (
                  <>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Streak
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                      Best Streak
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard.map((player, index) => (
                <tr key={player._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-lg font-bold ${getRankColor(index + 1)}`}
                    >
                      {getRankIcon(index + 1)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-nfl-blue flex items-center justify-center text-white font-bold">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {player.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {player.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">
                      {viewMode === "overall"
                        ? player.totalPicks
                        : player.weekPicks}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">
                      {viewMode === "overall"
                        ? `${player.winPercentage}%`
                        : `${player.correctPicks}/${player.weekPicks}`}
                    </div>
                  </td>
                  {viewMode === "overall" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">
                          {player.currentStreak}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">
                          {player.bestStreak}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-lg font-bold text-nfl-blue">
                      {player.points}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No leaderboard data available yet.</p>
            <p className="text-sm">Start making picks to see the rankings!</p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {leaderboard.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-nfl-blue mb-2">
              {leaderboard.length}
            </div>
            <div className="text-gray-600">Total Players</div>
          </div>

          <div className="card text-center">
            <div className="text-2xl font-bold text-nfl-blue mb-2">
              {leaderboard[0]?.points || 0}
            </div>
            <div className="text-gray-600">Top Score</div>
          </div>

          <div className="card text-center">
            <div className="text-2xl font-bold text-nfl-blue mb-2">
              {leaderboard[leaderboard.length - 1]?.points || 0}
            </div>
            <div className="text-gray-600">Lowest Score</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          📋 How to Read the Leaderboard
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p>
              <strong>Overall Season:</strong> Cumulative performance across all
              weeks
            </p>
            <p>
              <strong>Weekly Results:</strong> Performance for a specific week
              only
            </p>
            <p>
              <strong>Win %:</strong> Percentage of correct picks overall
            </p>
          </div>
          <div>
            <p>
              <strong>Streak:</strong> Current consecutive correct picks
            </p>
            <p>
              <strong>Best Streak:</strong> Longest consecutive correct picks
            </p>
            <p>
              <strong>Points:</strong> Total points earned (1 per correct pick)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
