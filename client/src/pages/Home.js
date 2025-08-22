import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className="text-5xl md:text-6xl font-bold text-nfl-blue mb-6">
          🏈 NFL Pick'em League
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Join your family and friends in predicting NFL game outcomes every
          week. Test your football knowledge and compete for bragging rights!
        </p>

        {!user ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-nfl-gold hover:bg-yellow-500 text-nfl-blue px-8 py-3 rounded-lg text-lg font-bold transition-colors duration-200"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="bg-nfl-blue hover:bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-bold transition-colors duration-200"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/picks"
              className="bg-nfl-gold hover:bg-yellow-500 text-nfl-blue px-8 py-3 rounded-lg text-lg font-bold transition-colors duration-200"
            >
              Make Your Picks
            </Link>
            <Link
              to="/leaderboard"
              className="bg-nfl-blue hover:bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-bold transition-colors duration-200"
            >
              View Leaderboard
            </Link>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 py-16">
        <div className="card text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-nfl-blue mb-3">Weekly Picks</h3>
          <p className="text-gray-600">
            Submit your predictions for every NFL game each week. Choose your
            winners and track your performance.
          </p>
        </div>

        <div className="card text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-bold text-nfl-blue mb-3">Leaderboard</h3>
          <p className="text-gray-600">
            See how you stack up against family and friends. Compete for the top
            spot throughout the season.
          </p>
        </div>

        <div className="card text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-xl font-bold text-nfl-blue mb-3">Easy to Use</h3>
          <p className="text-gray-600">
            Simple, intuitive interface that works on all devices. Make picks
            quickly and easily.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16">
        <h2 className="text-3xl font-bold text-nfl-blue text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="bg-nfl-blue text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h4 className="font-bold text-lg mb-2">Sign Up</h4>
            <p className="text-gray-600">
              Create your account and join the league
            </p>
          </div>

          <div className="text-center">
            <div className="bg-nfl-blue text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h4 className="font-bold text-lg mb-2">Make Picks</h4>
            <p className="text-gray-600">Choose winners for each NFL game</p>
          </div>

          <div className="text-center">
            <div className="bg-nfl-blue text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h4 className="font-bold text-lg mb-2">Watch Games</h4>
            <p className="text-gray-600">See how your predictions play out</p>
          </div>

          <div className="text-center">
            <div className="bg-nfl-blue text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              4
            </div>
            <h4 className="font-bold text-lg mb-2">Track Progress</h4>
            <p className="text-gray-600">
              Monitor your standing on the leaderboard
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-nfl-blue rounded-lg p-8 text-center text-white mb-16">
        <h2 className="text-3xl font-bold mb-4">Ready to Join the Fun?</h2>
        <p className="text-xl mb-6">
          Don't miss out on the excitement of NFL Pick'em!
        </p>
        {!user ? (
          <Link
            to="/register"
            className="bg-nfl-gold hover:bg-yellow-500 text-nfl-blue px-8 py-3 rounded-lg text-lg font-bold transition-colors duration-200"
          >
            Join Now
          </Link>
        ) : (
          <Link
            to="/picks"
            className="bg-nfl-gold hover:bg-yellow-500 text-nfl-blue px-8 py-3 rounded-lg text-lg font-bold transition-colors duration-200"
          >
            Make Your Picks
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;
