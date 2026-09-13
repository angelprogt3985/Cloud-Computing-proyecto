const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const db = require("./services/db");

const app = express();

app.use(cors());
app.use(express.json());

// Health check — used by you to confirm the container is alive locally,
// and later by Cloud Run / uptime checks in Cloud Monitoring. Reports
// database connectivity too, since "the API responds" and "the API can
// actually reach the database" are different failure modes worth
// telling apart.
app.get("/health", async (req, res) => {
  const dbOk = await db.checkConnection();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    env: config.nodeEnv,
    time: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({ service: "glacierquest-api", status: "running" });
});

app.listen(config.port, () => {
  console.log(`Glacier Quest API listening on port ${config.port} (${config.nodeEnv})`);
});