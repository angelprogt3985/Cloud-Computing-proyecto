// Loads and validates environment variables in one place, so every
// other file just does `require('../config/env')` instead of reading
// process.env directly. Keeps .env / real secrets out of the rest of
// the codebase.

require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "glacierquest",
    // Set only in production (Cloud Run), when connecting to Cloud SQL
    // via its Unix socket instead of a host/port TCP connection.
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || null
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || null
  },

  gcpProjectId: process.env.GCP_PROJECT_ID || null
};

module.exports = config;
