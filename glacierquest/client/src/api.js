import { API_BASE } from "./config.js";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed (${res.status})`);
  }
  return data;
}

// Join the room (no playerId) — also used to "rejoin" after a refresh,
// since the API treats a repeated name as the same player.
export function joinGame(name, x, y) {
  return request("/position", { method: "POST", body: JSON.stringify({ name, x, y }) });
}

export function updatePosition(playerId, x, y) {
  return request("/position", { method: "POST", body: JSON.stringify({ playerId, x, y }) });
}

// Combined poll: everyone's current position + the NPC, in one request.
export function getState() {
  return request("/position", { method: "GET" });
}

export function getChat() {
  return request("/chat", { method: "GET" });
}

export function postChat(playerId, body) {
  return request("/chat", { method: "POST", body: JSON.stringify({ playerId, body }) });
}

export function collectItem(playerId, itemType) {
  return request("/inventory", { method: "POST", body: JSON.stringify({ playerId, itemType }) });
}

export function getInventory(playerId) {
  return request(`/inventory?playerId=${playerId}`, { method: "GET" });
}

export function battleAction(playerId, action) {
  return request("/battle", { method: "POST", body: JSON.stringify({ playerId, action }) });
}
