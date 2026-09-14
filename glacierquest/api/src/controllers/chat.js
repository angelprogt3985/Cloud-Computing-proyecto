const chatModel = require("../models/chat_message");
const playerModel = require("../models/player");

const MAX_MESSAGE_LENGTH = 140;

async function list(req, res) {
  const messages = await chatModel.listRecentMessages(50);
  res.json({ messages });
}

async function create(req, res) {
  const { playerId, body } = req.body;
  const trimmedBody = (body || "").trim();

  if (!playerId || !trimmedBody) {
    return res.status(400).json({ error: "playerId and body are required" });
  }
  if (trimmedBody.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `body must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
  }

  const player = await playerModel.getPlayerById(playerId);
  if (!player) {
    return res.status(404).json({ error: "player not found" });
  }

  const message = await chatModel.createMessage(playerId, trimmedBody);
  res.status(201).json({ message: { ...message, player_name: player.name } });
}

module.exports = { list, create };
