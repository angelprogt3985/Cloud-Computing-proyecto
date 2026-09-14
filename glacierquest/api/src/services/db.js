// Single shared connection pool used by every model. Kept small
// (max 5) on purpose — with position polling every 1-2s from a
// handful of players, a small pool comfortably serves everyone
// without approaching Cloud SQL's connection limit on the smallest
// tier. See docs/cost-estimate.md for the reasoning.

const { Pool } = require("pg");
const config = require("../config/env");

let pool;

if (config.db.instanceConnectionName) {
  // Production on Cloud Run: connect via the Cloud SQL Unix socket
  // that Cloud Run's native Cloud SQL connector mounts automatically
  // when the service is configured with --add-cloudsql-instances.
  pool = new Pool({
    host: `/cloudsql/${config.db.instanceConnectionName}`,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    max: 5
  });
} else {
  // Local dev / anywhere else: plain TCP connection.
  pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    max: 5
  });
}

async function query(text, params) {
  return pool.query(text, params);
}

async function checkConnection() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("Database connection check failed:", err.message);
    return false;
  }
}

module.exports = { pool, query, checkConnection };
