const axios = require("axios");

class ESPNService {
  constructor() {
    this.baseURL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Get all games for a specific week
   */
  async getWeekGames(season, week) {
    try {
      const url = `${this.baseURL}/scoreboard?week=${week}&year=${season}`;
      const response = await axios.get(url, { timeout: this.timeout });

      if (!response.data || !response.data.events) {
        throw new Error("Invalid response from ESPN API");
      }

      return response.data.events.map((event) => this.parseGameEvent(event));
    } catch (error) {
      console.error(`Error fetching ESPN week ${week} games:`, error.message);
      throw error;
    }
  }

  /**
   * Get live scores for all games
   */
  async getLiveScores(season, week) {
    try {
      const url = `${this.baseURL}/scoreboard?week=${week}&year=${season}&xhr=1`;
      const response = await axios.get(url, { timeout: this.timeout });

      if (
        !response.data ||
        !response.data.content ||
        !response.data.content.sbData
      ) {
        // This is normal before the season starts - no games to fetch
        console.log(
          `ℹ️ No games found for Week ${week} - season may not have started yet`
        );
        return [];
      }

      const games = response.data.content.sbData.events;
      return games.map((game) => this.parseLiveGame(game));
    } catch (error) {
      console.error(
        `Error fetching ESPN live scores for week ${week}:`,
        error.message
      );
      // Don't throw error for pre-season - just return empty array
      if (error.message.includes("Invalid response from ESPN API")) {
        console.log(
          `ℹ️ Week ${week} may not have started yet - returning empty results`
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse a game event from ESPN API
   */
  parseGameEvent(event) {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const awayTeam = competition.competitors?.find((c) => c.awayAway);
    const homeTeam = competition.competitors?.find((c) => c.homeAway);

    if (!awayTeam || !homeTeam) return null;

    return {
      espnGameId: event.id,
      awayTeam: awayTeam.team.name,
      homeTeam: homeTeam.team.name,
      awayScore: parseInt(awayTeam.score) || 0,
      homeScore: parseInt(homeTeam.score) || 0,
      status: this.parseGameStatus(event.status.type.state),
      quarter: this.parseQuarter(event.status.type.period),
      timeRemaining: event.status.type.description,
      date: new Date(event.date),
      venue: event.competitions?.[0]?.venue?.fullName || "TBD",
    };
  }

  /**
   * Parse live game data from ESPN API
   */
  parseLiveGame(game) {
    const competition = game.competitions?.[0];
    if (!competition) return null;

    const awayTeam = competition.competitors?.find((c) => c.awayAway);
    const homeTeam = competition.competitors?.find((c) => c.homeAway);

    if (!awayTeam || !homeTeam) return null;

    return {
      espnGameId: game.id,
      awayTeam: awayTeam.team.name,
      homeTeam: homeTeam.team.name,
      awayScore: parseInt(awayTeam.score) || 0,
      homeScore: parseInt(homeTeam.score) || 0,
      status: this.parseGameStatus(game.status.type.state),
      quarter: this.parseQuarter(game.status.type.period),
      timeRemaining: game.status.type.description,
      lastUpdated: new Date(),
    };
  }

  /**
   * Parse ESPN game status to our status
   */
  parseGameStatus(espnStatus) {
    switch (espnStatus) {
      case "pre":
        return "scheduled";
      case "in":
        return "live";
      case "post":
        return "final";
      case "postponed":
        return "postponed";
      case "cancelled":
        return "cancelled";
      default:
        return "scheduled";
    }
  }

  /**
   * Parse ESPN quarter information
   */
  parseQuarter(period) {
    if (!period) return null;

    switch (period) {
      case 1:
        return "1";
      case 2:
        return "2";
      case 3:
        return "3";
      case 4:
        return "4";
      case 5:
        return "OT";
      default:
        return period.toString();
    }
  }

  /**
   * Get specific game details
   */
  async getGameDetails(espnGameId) {
    try {
      const url = `${this.baseURL}/summary?event=${espnGameId}`;
      const response = await axios.get(url, { timeout: this.timeout });

      if (!response.data || !response.data.header) {
        throw new Error("Invalid response from ESPN API");
      }

      return this.parseGameEvent(response.data.header);
    } catch (error) {
      console.error(
        `Error fetching ESPN game details for ${espnGameId}:`,
        error.message
      );
      throw error;
    }
  }
}

module.exports = new ESPNService();
