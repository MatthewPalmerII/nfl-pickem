import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPick, setEditingPick] = useState(null);
  const [addingPick, setAddingPick] = useState(null);
  const [overridingScore, setOverridingScore] = useState(null);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchData();
    }
  }, [selectedWeek]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersResponse = await api.get("/api/users");
      setUsers(usersResponse.data);

      // Fetch all games
      const gamesResponse = await api.get("/api/games");
      setGames(gamesResponse.data);

      // Fetch all picks
      const picksResponse = await api.get(
        `/api/picks/admin?week=${selectedWeek}`
      );
      setPicks(picksResponse.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPick = (pick) => {
    setEditingPick(pick);
  };

  const handleAddPick = (userId, gameId, week) => {
    setAddingPick({ userId, gameId, week });
  };

  const handleSavePick = async (pickId, selectedTeam) => {
    try {
      const editReason = editingPick?.editReason || "Admin edit";

      const response = await api.put(`/api/picks/${pickId}`, {
        selectedTeam,
        editReason,
      });

      // Update local state with the response data
      setPicks((prev) =>
        prev.map((p) =>
          p._id === pickId
            ? {
                ...p,
                selectedTeam,
                lastEditedBy: response.data.pick.lastEditedBy,
                lastEditedAt: response.data.pick.lastEditedAt,
                editReason: response.data.pick.editReason,
              }
            : p
        )
      );

      setEditingPick(null);

      // Show appropriate success message
      if (response.data.gameWasLocked) {
        toast.success("Pick updated (game was locked)");
      } else {
        toast.success("Pick updated successfully");
      }
    } catch (error) {
      console.error("Error updating pick:", error);
      toast.error("Failed to update pick");
    }
  };

  const handleSaveNewPick = async (selectedTeam) => {
    try {
      const { userId, gameId, week } = addingPick;
      const season = new Date().getFullYear();

      const response = await api.post("/api/picks/admin-create", {
        userId,
        gameId,
        week,
        season,
        selectedTeam,
        editReason: "Admin created pick on user's behalf",
      });

      // Add the new pick to local state
      setPicks((prev) => [...prev, response.data.pick]);

      setAddingPick(null);
      toast.success("Pick created successfully");
    } catch (error) {
      console.error("Error creating pick:", error);
      toast.error("Failed to create pick");
    }
  };

  const handleDeletePick = async (pickId) => {
    if (!window.confirm("Are you sure you want to delete this pick?")) return;

    try {
      await api.delete(`/api/picks/${pickId}`);

      // Update local state
      setPicks((prev) => prev.filter((p) => p._id !== pickId));
      toast.success("Pick deleted successfully");
    } catch (error) {
      console.error("Error deleting pick:", error);
      toast.error("Failed to delete pick");
    }
  };

  const handleScoreOverride = (game) => {
    setOverridingScore({
      gameId: game._id,
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
      week: game.week,
      awayScore: "",
      homeScore: "",
      reason: "",
    });
  };

  const handleSaveScoreOverride = async () => {
    try {
      const { gameId, awayScore, homeScore, reason } = overridingScore;

      if (!awayScore || !homeScore) {
        toast.error("Please enter both scores");
        return;
      }

      const response = await api.put("/api/picks/admin/override-score", {
        gameId,
        awayScore: parseInt(awayScore),
        homeScore: parseInt(homeScore),
        reason: reason || "Admin score override",
      });

      setOverridingScore(null);
      toast.success("Score overridden successfully");

      // Refresh data to show updated scores
      fetchData();
    } catch (error) {
      console.error("Error overriding score:", error);
      toast.error("Failed to override score");
    }
  };

  const getWeekGames = () => {
    const weekGames = games.filter(
      (game) => game.week === parseInt(selectedWeek)
    );
    console.log(
      `getWeekGames() for week ${selectedWeek}: found ${weekGames.length} games`
    );
    if (weekGames.length > 0) {
      console.log(
        "Sample games:",
        weekGames.slice(0, 3).map((g) => ({
          id: g._id,
          week: g.week,
          teams: `${g.awayTeam} @ ${g.homeTeam}`,
        }))
      );
    }
    return weekGames;
  };

  const getUserPicksForWeek = (userId) => {
    console.log(
      `\n=== Filtering picks for user ${userId}, week ${selectedWeek} ===`
    );
    console.log("Total picks available:", picks.length);
    console.log("Total games available:", games.length);

    // Log a few sample picks to see their structure
    if (picks.length > 0) {
      console.log("Sample pick 1:", {
        _id: picks[0]._id,
        userId: picks[0].userId,
        gameId: picks[0].gameId,
        week: picks[0].week,
        selectedTeam: picks[0].selectedTeam,
      });

      if (picks.length > 1) {
        console.log("Sample pick 2:", {
          _id: picks[1]._id,
          userId: picks[1].userId,
          gameId: picks[1].gameId,
          week: picks[1].week,
          selectedTeam: picks[1].selectedTeam,
        });
      }
    }

    // First, filter out any picks with corrupted userId data
    const validPicks = picks.filter((pick) => pick.userId && pick.userId._id);

    if (validPicks.length !== picks.length) {
      console.log(
        `⚠️ Warning: ${
          picks.length - validPicks.length
        } picks have corrupted userId data and will be excluded`
      );
    }

    const userPicks = validPicks.filter((pick) => {
      // Convert both IDs to strings for comparison
      const pickUserId = pick.userId._id.toString();
      const targetUserId = userId.toString();

      const userIdMatch = pickUserId === targetUserId;
      // Use pick.week instead of pick.gameId.week since the pick has its own week field
      const weekMatch = pick.week === parseInt(selectedWeek);

      console.log(
        `Pick ${pick._id}: userId match = ${userIdMatch}, week match = ${weekMatch}`
      );
      console.log(`  - pick.userId._id: ${pickUserId}`);
      console.log(`  - target userId: ${targetUserId}`);
      console.log(`  - pick.week: ${pick.week}`);
      console.log(`  - target week: ${selectedWeek}`);

      return userIdMatch && weekMatch;
    });

    console.log(
      `Final filtered picks for user ${userId}, week ${selectedWeek}:`,
      userPicks
    );
    return userPicks;
  };

  const getGameById = (gameId) => {
    return games.find((g) => g._id === gameId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nfl-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage users, view picks, and edit data as needed
          </p>
        </div>

        {/* Week Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Week
          </label>
          <select
            value={selectedWeek}
            onChange={(e) => {
              const week = parseInt(e.target.value);
              console.log(
                `Week selector changed to: ${week} (type: ${typeof week})`
              );
              setSelectedWeek(week);
            }}
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">🏈</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Games
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {games.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">🎯</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Picks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {picks.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Week {selectedWeek}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {getWeekGames().length} games
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Games and Scores Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Week {selectedWeek} Games and Scores
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              View game details and override scores if needed
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Game
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getWeekGames().map((game) => (
                  <tr key={game._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      <div className="text-sm text-gray-500">{game.venue}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{new Date(game.date).toLocaleDateString()}</div>
                      <div className="text-gray-500">{game.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {/* This would show current score if we had game results */}
                      <span className="text-gray-400">No score yet</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Scheduled
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleScoreOverride(game)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Override Score
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users and Picks Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Week {selectedWeek} Picks Overview
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              View and manage all user picks for this week
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  {getWeekGames().map((game) => (
                    <th
                      key={game._id}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="text-center">
                        <div className="font-semibold">{game.awayTeam}</div>
                        <div className="text-xs text-gray-400">@</div>
                        <div className="font-semibold">{game.homeTeam}</div>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  console.log(`\n=== Processing user: ${user.name} ===`);
                  console.log(`User object:`, user);
                  console.log(`User._id: ${user._id}`);
                  console.log(`User.id: ${user.id}`);

                  const userPicks = getUserPicksForWeek(user._id);
                  return (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-nfl-blue flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            {user.isAdmin && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {getWeekGames().map((game) => {
                        const pick = userPicks.find(
                          (p) => p.gameId._id === game._id
                        );
                        return (
                          <td
                            key={game._id}
                            className="px-3 py-4 whitespace-nowrap text-center"
                          >
                            {pick ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    pick.selectedTeam === game.awayTeam
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {pick.selectedTeam}
                                </span>
                                <button
                                  onClick={() => handleEditPick(pick)}
                                  className="mt-1 text-xs text-nfl-blue hover:text-nfl-blue-dark"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="text-gray-400 text-sm">
                                  No pick
                                </span>
                                <button
                                  onClick={() =>
                                    handleAddPick(user._id, game._id, game.week)
                                  }
                                  className="mt-1 text-xs text-green-600 hover:text-green-800"
                                >
                                  Add Pick
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-nfl-blue hover:text-nfl-blue-dark"
                          >
                            View All
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Pick Modal */}
        {editingPick && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Edit Pick
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Game: {editingPick.gameId?.awayTeam} @{" "}
                    {editingPick.gameId?.homeTeam}
                  </p>
                  <p className="text-sm text-gray-600">
                    Current Pick:{" "}
                    <span className="font-medium">
                      {editingPick.selectedTeam}
                    </span>
                  </p>

                  {/* Show edit history if available */}
                  {editingPick.lastEditedBy && (
                    <div className="mt-2 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                      <p className="text-xs text-orange-800">
                        <strong>Previously edited:</strong>{" "}
                        {new Date(editingPick.lastEditedAt).toLocaleString()}
                      </p>
                      {editingPick.editReason && (
                        <p className="text-xs text-orange-700 mt-1">
                          Reason: {editingPick.editReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Pick
                  </label>
                  <select
                    value={editingPick.selectedTeam}
                    onChange={(e) =>
                      setEditingPick({
                        ...editingPick,
                        selectedTeam: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
                  >
                    <option value={editingPick.gameId?.awayTeam}>
                      {editingPick.gameId?.awayTeam}
                    </option>
                    <option value={editingPick.gameId?.homeTeam}>
                      {editingPick.gameId?.homeTeam}
                    </option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edit Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., User request, Correction, etc."
                    value={editingPick.editReason || ""}
                    onChange={(e) =>
                      setEditingPick({
                        ...editingPick,
                        editReason: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setEditingPick(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleSavePick(editingPick._id, editingPick.selectedTeam)
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-nfl-blue border border-transparent rounded-md hover:bg-nfl-blue-dark"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Pick Modal */}
        {addingPick && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Pick
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Game: {getGameById(addingPick.gameId)?.awayTeam} @{" "}
                    {getGameById(addingPick.gameId)?.homeTeam}
                  </p>
                  <p className="text-sm text-gray-600">
                    User: {users.find((u) => u._id === addingPick.userId)?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Week: {addingPick.week}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Team
                  </label>
                  <select
                    value={addingPick.selectedTeam || ""}
                    onChange={(e) =>
                      setAddingPick({
                        ...addingPick,
                        selectedTeam: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
                  >
                    <option value="">Select a team...</option>
                    <option value={getGameById(addingPick.gameId)?.awayTeam}>
                      {getGameById(addingPick.gameId)?.awayTeam}
                    </option>
                    <option value={getGameById(addingPick.gameId)?.homeTeam}>
                      {getGameById(addingPick.gameId)?.homeTeam}
                    </option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setAddingPick(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveNewPick(addingPick.selectedTeam)}
                    disabled={!addingPick.selectedTeam}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Create Pick
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score Override Modal */}
        {overridingScore && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Override Game Score
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Game: {overridingScore.awayTeam} @{" "}
                    {overridingScore.homeTeam}
                  </p>
                  <p className="text-sm text-gray-600">
                    Week: {overridingScore.week}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {overridingScore.awayTeam} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overridingScore.awayScore}
                    onChange={(e) =>
                      setOverridingScore({
                        ...overridingScore,
                        awayScore: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
                    placeholder="0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {overridingScore.homeTeam} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overridingScore.homeScore}
                    onChange={(e) =>
                      setOverridingScore({
                        ...overridingScore,
                        homeScore: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
                    placeholder="0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Override (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ESPN API error, Score correction, etc."
                    value={overridingScore.reason}
                    onChange={(e) =>
                      setOverridingScore({
                        ...overridingScore,
                        reason: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setOverridingScore(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveScoreOverride}
                    disabled={
                      !overridingScore.awayScore || !overridingScore.homeScore
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Override Score
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
