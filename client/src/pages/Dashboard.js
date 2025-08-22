import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPicks: 0,
    correctPicks: 0,
    winPercentage: 0,
    currentStreak: 0,
    bestStreak: 0,
    rank: 0,
    totalPlayers: 0,
  });
  const [recentPicks, setRecentPicks] = useState([]);
  const [leagueLog, setLeagueLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingLog, setRefreshingLog] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh league log every 30 seconds to catch updates
  useEffect(() => {
    const interval = setInterval(refreshLeagueLog, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, picksResponse, logResponse] = await Promise.all([
        api.get("/api/stats/user"),
        api.get("/api/picks/recent"),
        api.get("/api/picks/league-log"),
      ]);

      setStats(statsResponse.data);
      setRecentPicks(picksResponse.data.picks || []);
      setLeagueLog(logResponse.data.log || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLeagueLog = async () => {
    try {
      setRefreshingLog(true);
      const response = await api.get("/api/picks/league-log");
      setLeagueLog(response.data.log || []);
    } catch (error) {
      console.error("Error refreshing league log:", error);
    } finally {
      setRefreshingLog(false);
    }
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-nfl-blue to-blue-800 rounded-lg p-8 text-white mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back, {user.name}! 🏈
        </h1>
        <p className="text-xl opacity-90">
          Ready to make your picks for this week's NFL games?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/picks"
          className="card hover:shadow-lg transition-shadow duration-200 border-l-4 border-nfl-gold"
        >
          <div className="flex items-center">
            <div className="text-4xl mr-4">📝</div>
            <div>
              <h3 className="text-xl font-bold text-nfl-blue mb-2">
                Make Your Picks
              </h3>
              <p className="text-gray-600">
                Submit predictions for this week's games
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/leaderboard"
          className="card hover:shadow-lg transition-shadow duration-200 border-l-4 border-nfl-gold"
        >
          <div className="flex items-center">
            <div className="text-4xl mr-4">🏆</div>
            <div>
              <h3 className="text-xl font-bold text-nfl-blue mb-2">
                View Leaderboard
              </h3>
              <p className="text-gray-600">
                See how you rank against other players
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-nfl-blue mb-2">
            {stats.winPercentage}%
          </div>
          <div className="text-gray-600">Win Rate</div>
        </div>

        <div className="card text-center">
          <div className="text-3xl font-bold text-nfl-blue mb-2">
            {stats.correctPicks}
          </div>
          <div className="text-gray-600">Correct Picks</div>
        </div>

        <div className="card text-center">
          <div className="text-3xl font-bold text-nfl-blue mb-2">
            {stats.currentStreak}
          </div>
          <div className="text-gray-600">Current Streak</div>
        </div>

        <div className="card text-center">
          <div className="text-3xl font-bold text-nfl-blue mb-2">
            {stats.rank}
          </div>
          <div className="text-gray-600">Current Rank</div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="card mb-8">
        <h3 className="text-xl font-bold text-nfl-blue mb-4">
          Performance Over Time
        </h3>
        <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>Performance chart will be displayed here</p>
          <p className="text-sm">(Coming soon - track your weekly progress)</p>
        </div>
      </div>

      {/* League Log */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-nfl-blue">League Log</h3>
            <p className="text-sm text-gray-600">
              Recent league activity and pick changes
            </p>
          </div>
          <button
            onClick={refreshLeagueLog}
            disabled={refreshingLog}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              refreshingLog
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-nfl-blue text-white hover:bg-nfl-blue-dark"
            }`}
          >
            {refreshingLog ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Refreshing...
              </span>
            ) : (
              "🔄 Refresh"
            )}
          </button>
        </div>
        {leagueLog.length > 0 ? (
          <div className="space-y-3">
            {leagueLog.map((log, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                      log.type === "pick_submission"
                        ? "bg-green-100 text-green-600"
                        : log.type === "pick_edit"
                        ? "bg-orange-100 text-orange-600"
                        : log.type === "pick_update"
                        ? "🔄"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {log.type === "pick_submission"
                      ? "🎯"
                      : log.type === "pick_edit"
                      ? "✏️"
                      : log.type === "pick_update"
                      ? "🔄"
                      : "📝"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {log.message}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No league activity yet</p>
            <p className="text-sm text-gray-400">
              Activity will appear here as users submit picks and admins make
              changes
            </p>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-800 mb-3">💡 Pro Tips</h3>
        <ul className="space-y-2 text-yellow-700">
          <li>
            • Make your picks early in the week to avoid missing deadlines
          </li>
          <li>
            • Check injury reports and weather conditions before making picks
          </li>
          <li>
            • Don't always pick the favorites - underdogs can surprise you!
          </li>
          <li>• Keep track of your performance to improve your strategy</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
