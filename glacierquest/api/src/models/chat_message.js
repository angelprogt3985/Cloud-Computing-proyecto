const db = require("../services/db");

async function createMessage(playerId, body) {
  const result = await db.query(
    `INSERT INTO chat_messages (player_id, body)
     VALUES ($1, $2)
     RETURNING *`,
    [playerId, body]
  );
  return result.rows[0];
}

// Returns the most recent messages, oldest first, joined with the
// player's name so the client doesn't need a second lookup per message.
async function listRecentMessages(limit = 50) {
  const result = await db.query(
    `SELECT cm.id, cm.body, cm.created_at, p.name AS player_name, p.id AS player_id
     FROM chat_messages cm
     JOIN players p ON p.id = cm.player_id
     ORDER BY cm.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.reverse();
}

module.exports = { createMessage, listRecentMessages };
