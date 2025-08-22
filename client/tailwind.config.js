/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "nfl-blue": "#013369",
        "nfl-red": "#D50A0A",
        "nfl-gold": "#FFB612",
      },
      fontFamily: {
        nfl: ["Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
