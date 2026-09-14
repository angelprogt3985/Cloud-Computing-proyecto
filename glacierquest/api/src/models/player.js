const db = require("../services/db");

// A player counts as "active" (visible to others on the map) if we've
// heard from them in the last 30 seconds. With no explicit disconnect
// event in a polling model, this is what makes players quietly
// disappear from everyone else's screen a few seconds after they
// close the tab, instead of leaving stale ghosts behind.
const ACTIVE_WINDOW_SECONDS = 30;

async function createPlayer(name, x, y) {
  const result = await db.query(
    `INSERT INTO players (name, x, y, last_seen_at)
     VALUES ($1, $2, $3, now())
     RETURNING *`,
    [name, x, y]
  );
  return result.rows[0];
}

async function getPlayerByName(name) {
  const result = await db.query(`SELECT * FROM players WHERE name = $1`, [name]);
  return result.rows[0] || null;
}

async function getPlayerById(id) {
  const result = await db.query(`SELECT * FROM players WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function updatePosition(id, x, y) {
  const result = await db.query(
    `UPDATE players SET x = $2, y = $3, last_seen_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, x, y]
  );
  return result.rows[0] || null;
}

async function updateStats(id, { hp, coins }) {
  const result = await db.query(
    `UPDATE players SET hp = $2, coins = $3, last_seen_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, hp, coins]
  );
  return result.rows[0] || null;
}

async function listActivePlayers() {
  const result = await db.query(
    `SELECT * FROM players
     WHERE last_seen_at > now() - interval '${ACTIVE_WINDOW_SECONDS} seconds'
     ORDER BY id ASC`
  );
  return result.rows;
}

module.exports = {
  createPlayer,
  getPlayerByName,
  getPlayerById,
  updatePosition,
  updateStats,
  listActivePlayers
};
