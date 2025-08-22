import React from "react";

const Rules = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-nfl-blue mb-4">
          📋 League Rules
        </h1>
        <p className="text-xl text-gray-600">
          How to play and win in our NFL Pick'em League
        </p>
      </div>

      {/* Basic Rules */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-nfl-blue mb-4">
          🎯 Basic Rules
        </h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-nfl-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Make Your Picks
              </h3>
              <p className="text-gray-600">
                Each week, you must pick the winner of every NFL game. You can't
                skip games or pick ties.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-nfl-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Weekly Deadlines
              </h3>
              <p className="text-gray-600">
                Picks must be submitted before the first game of the week
                begins. Once the deadline passes, your picks are locked and
                cannot be changed.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-nfl-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Scoring System
              </h3>
              <p className="text-gray-600">
                You earn 1 point for each correct pick. No points are awarded
                for incorrect picks.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-nfl-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              4
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Season Long Competition
              </h3>
              <p className="text-gray-600">
                Your total points from all weeks determine your final ranking.
                The player with the most points at the end of the season wins!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Play */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-nfl-blue mb-4">
          🎮 How to Play
        </h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-nfl-gold text-nfl-blue rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              A
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Log In Weekly
              </h3>
              <p className="text-gray-600">
                Visit the website each week to make your picks for the upcoming
                NFL games.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-nfl-gold text-nfl-blue rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              B
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Select Winners
              </h3>
              <p className="text-gray-600">
                For each game, click on the team you think will win. You can
                change your picks until the deadline.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-nfl-gold text-nfl-blue rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              C
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Submit Your Picks
              </h3>
              <p className="text-gray-600">
                Once you've made all your picks, click "Submit Picks" to lock
                them in.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-nfl-gold text-nfl-blue rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              D
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Watch and Track
              </h3>
              <p className="text-gray-600">
                Watch the games and check the leaderboard to see how you're
                performing!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-nfl-blue mb-4">
          ⚠️ Important Notes
        </h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="text-red-500 mr-3 mt-1">•</div>
            <p className="text-gray-700">
              <strong>No late submissions:</strong> Once the deadline passes,
              you cannot submit or change picks.
            </p>
          </div>

          <div className="flex items-start">
            <div className="text-red-500 mr-3 mt-1">•</div>
            <p className="text-gray-700">
              <strong>All games count:</strong> You must pick every game each
              week to be eligible for that week's points.
            </p>
          </div>

          <div className="flex items-start">
            <div className="text-red-500 mr-3 mt-1">•</div>
            <p className="text-gray-700">
              <strong>Game outcomes:</strong> Picks are based on the final score
              after overtime (if applicable).
            </p>
          </div>

          <div className="flex items-start">
            <div className="text-red-500 mr-3 mt-1">•</div>
            <p className="text-gray-700">
              <strong>Fair play:</strong> Only one account per person. Multiple
              accounts will result in disqualification.
            </p>
          </div>
        </div>
      </div>

      {/* Strategy Tips */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-nfl-blue mb-4">
          💡 Strategy Tips
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Research Matters
            </h3>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li>• Check injury reports</li>
              <li>• Consider weather conditions</li>
              <li>• Look at recent team performance</li>
              <li>• Review head-to-head matchups</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Risk Management
            </h3>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li>• Don't always pick favorites</li>
              <li>• Consider underdog opportunities</li>
              <li>• Balance risk vs. reward</li>
              <li>• Stay consistent with your strategy</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tiebreakers */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-nfl-blue mb-4">
          🔗 Tiebreakers
        </h2>
        <p className="text-gray-700 mb-4">
          In the event of a tie at the end of the season, the following
          tiebreakers will be used:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>
            <strong>Total correct picks:</strong> Player with more correct picks
            wins
          </li>
          <li>
            <strong>Best weekly performance:</strong> Player with highest
            single-week score wins
          </li>
          <li>
            <strong>Longest winning streak:</strong> Player with longest streak
            of correct picks wins
          </li>
          <li>
            <strong>Coin flip:</strong> If still tied, a random selection will
            determine the winner
          </li>
        </ol>
      </div>

      {/* Contact */}
      <div className="card bg-blue-50 border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">❓ Questions?</h2>
        <p className="text-blue-700 mb-4">
          If you have any questions about the rules or need clarification,
          please contact the league administrator.
        </p>
        <p className="text-blue-600 text-sm">
          Remember: The goal is to have fun and enjoy some friendly competition
          with family and friends!
        </p>
      </div>
    </div>
  );
};

export default Rules;
