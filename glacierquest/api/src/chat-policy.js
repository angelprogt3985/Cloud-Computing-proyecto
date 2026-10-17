// Chat is transient room activity, not a conversation archive. RTDB cleanup
// removes expired records later; this read policy hides them immediately.
const CHAT_TTL_MS = 120000;
function recentMessages(messages, now = Date.now()) {
  return messages.filter(message => message && Number.isFinite(message.createdAt)
    && message.createdAt > now - CHAT_TTL_MS && message.createdAt <= now)
    .sort((a, b) => a.createdAt - b.createdAt).slice(-30);
}
function recentRoom(room, now) {
  return structuredClone({ ...room, messages: recentMessages(room.messages, now) });
}
module.exports = { CHAT_TTL_MS, recentMessages, recentRoom };
