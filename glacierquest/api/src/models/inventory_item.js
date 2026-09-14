const db = require("../services/db");

async function addItem(playerId, itemType) {
  const result = await db.query(
    `INSERT INTO inventory_items (player_id, item_type)
     VALUES ($1, $2)
     RETURNING *`,
    [playerId, itemType]
  );
  return result.rows[0];
}

async function listItemsForPlayer(playerId) {
  const result = await db.query(
    `SELECT * FROM inventory_items WHERE player_id = $1 ORDER BY acquired_at ASC`,
    [playerId]
  );
  return result.rows;
}

module.exports = { addItem, listItemsForPlayer };
