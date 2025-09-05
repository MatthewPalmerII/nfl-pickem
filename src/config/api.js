// API Configuration for different environments
const API_CONFIG = {
  // Development (local backend)
  development: {
    baseURL: "http://localhost:5000",
  },
  // Production (Railway backend)
  production: {
    baseURL:
      process.env.REACT_APP_API_URL ||
      "https://nfl-pickem-production.up.railway.app",
  },
  // Staging (if you have a staging environment)
  staging: {
    baseURL:
      process.env.REACT_APP_STAGING_API_URL ||
      "https://nfl-pickem-production.up.railway.app",
  },
};

// Get current environment
const environment = process.env.NODE_ENV || "development";

// Export the appropriate config
export const apiConfig = API_CONFIG[environment];

// Log the current configuration (remove in production)
if (environment === "development") {
  console.log("🌐 API Configuration:", apiConfig);
}

export default apiConfig;
