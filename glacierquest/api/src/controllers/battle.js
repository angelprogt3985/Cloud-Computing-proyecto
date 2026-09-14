const playerModel = require("../models/player");

// Intentionally stateless: each POST is one full exchange, resolved
// immediately, rather than a multi-turn battle session that would
// need its own table and id to track. This matches the "earliest
// RPGs — just a menu and Attack" scope from the project playbook.
async function act(req, res) {
  const { playerId, action } = req.body;

  if (!playerId || !["attack", "run"].includes(action)) {
    return res.status(400).json({ error: "playerId is required and action must be 'attack' or 'run'" });
  }

  const player = await playerModel.getPlayerById(playerId);
  if (!player) {
    return res.status(404).json({ error: "player not found" });
  }

  if (action === "run") {
    return res.json({
      message: "You back away safely.",
      player
    });
  }

  // action === "attack"
  const playerHits = Math.random() < 0.7;
  let hp = player.hp;
  let coins = player.coins;
  let message;

  if (playerHits) {
    const coinsGained = 5 + Math.floor(Math.random() * 11); // 5-15
    coins += coinsGained;
    message = `You strike the sage and find ${coinsGained} coins!`;
  } else {
    const hpLost = 1 + Math.floor(Math.random() * 5); // 1-5
    hp = Math.max(1, hp - hpLost);
    message = `The sage's frost bites back — you lose ${hpLost} HP.`;
  }

  const updated = await playerModel.updateStats(playerId, { hp, coins });
  res.json({ message, player: updated });
}

module.exports = { act };
