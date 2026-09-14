const inventoryModel = require("../models/inventory_item");
const playerModel = require("../models/player");

// The only collectible types the client currently spawns. Kept here
// as a whitelist so a bad request can't insert arbitrary item types.
const VALID_ITEM_TYPES = ["coin", "fish"];

async function list(req, res) {
  const { playerId } = req.query;
  if (!playerId) {
    return res.status(400).json({ error: "playerId query param is required" });
  }
  const items = await inventoryModel.listItemsForPlayer(playerId);
  res.json({ items });
}

async function create(req, res) {
  const { playerId, itemType } = req.body;

  if (!playerId || !VALID_ITEM_TYPES.includes(itemType)) {
    return res.status(400).json({
      error: `playerId is required and itemType must be one of: ${VALID_ITEM_TYPES.join(", ")}`
    });
  }

  const player = await playerModel.getPlayerById(playerId);
  if (!player) {
    return res.status(404).json({ error: "player not found" });
  }

  const item = await inventoryModel.addItem(playerId, itemType);
  res.status(201).json({ item });
}

module.exports = { list, create };
