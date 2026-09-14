const db = require("../services/db");

// Only one NPC exists at this scope (seeded by schema.sql), so this
// just reads that single row rather than taking an id.
async function getNpc() {
  const result = await db.query(`SELECT * FROM npc_state LIMIT 1`);
  return result.rows[0] || null;
}

module.exports = { getNpc };
