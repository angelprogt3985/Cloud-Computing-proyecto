const playerModel = require("../models/player");
const npcModel = require("../models/npc");

// GET /position — the main polling endpoint. The client calls this
// every 1-2 seconds to find out where everyone (and the NPC) currently
// is. Kept as a single combined read so a poll cycle is one request,
// not three.
async function list(req, res) {
  const [players, npc] = await Promise.all([
    playerModel.listActivePlayers(),
    npcModel.getNpc()
  ]);
  res.json({ players, npc });
}

// POST /position — two jobs in one route, matching the skeleton's
// suggested single position.js file:
//   - no playerId in the body  -> this is a new player joining the room
//   - playerId present         -> this is a movement update for them
async function upsert(req, res) {
  const { playerId, name, x, y } = req.body;

  if (typeof x !== "number" || typeof y !== "number") {
    return res.status(400).json({ error: "x and y must be numbers" });
  }

  if (!playerId) {
    const trimmedName = (name || "").trim();
    if (!trimmedName || trimmedName.length > 32) {
      return res.status(400).json({ error: "name is required (max 32 characters)" });
    }

    const existing = await playerModel.getPlayerByName(trimmedName);
    if (existing) {
      // Same name reconnecting (e.g. page refresh) — treat it as
      // rejoining as that player rather than erroring, since we have
      // no login system at this scope.
      const rejoined = await playerModel.updatePosition(existing.id, x, y);
      return res.json({ player: rejoined });
    }

    const created = await playerModel.createPlayer(trimmedName, x, y);
    return res.status(201).json({ player: created });
  }

  const updated = await playerModel.updatePosition(playerId, x, y);
  if (!updated) {
    return res.status(404).json({ error: "player not found" });
  }
  res.json({ player: updated });
}

module.exports = { list, upsert };
