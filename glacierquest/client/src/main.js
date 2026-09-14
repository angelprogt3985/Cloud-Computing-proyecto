import * as api from "./api.js";
import { PlazaScene } from "./scenes/PlazaScene.js";
import { BattleScene } from "./scenes/BattleScene.js";

const POSITION_POLL_MS = 1500;
const CHAT_POLL_MS = 2000;

const els = {
  joinOverlay: document.getElementById("join-overlay"),
  joinForm: document.getElementById("join-form"),
  joinInput: document.getElementById("join-name"),
  joinError: document.getElementById("join-error"),

  canvas: document.getElementById("map-canvas"),
  hudName: document.getElementById("hud-name"),
  hudCoins: document.getElementById("hud-coins"),
  hint: document.getElementById("hint-bar"),

  chatList: document.getElementById("chat-list"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),

  inventoryList: document.getElementById("inventory-list"),

  battleOverlay: document.getElementById("battle-overlay"),
  battleLog: document.getElementById("battle-log"),
  battleAttack: document.getElementById("battle-attack"),
  battleRun: document.getElementById("battle-run"),
  battleLeave: document.getElementById("battle-leave")
};

let localPlayer = null; // { id, name, x, y, hp, coins, level }
let npc = null;
let lastChatIds = new Set();

const plaza = new PlazaScene(els.canvas);
const battle = new BattleScene(
  {
    overlayEl: els.battleOverlay,
    logEl: els.battleLog,
    attackBtn: els.battleAttack,
    runBtn: els.battleRun,
    leaveBtn: els.battleLeave
  },
  (updatedPlayer) => {
    localPlayer = { ...localPlayer, ...updatedPlayer };
    updateHud();
  }
);

function updateHud() {
  if (!localPlayer) return;
  els.hudName.textContent = `${localPlayer.name} · Lv ${localPlayer.level}`;
  els.hudCoins.textContent = localPlayer.coins;
}

function renderInventoryCount() {
  // The server is the source of truth for counts; this just re-reads
  // it after a collection event rather than trusting local state.
  api.getInventory(localPlayer.id).then(({ items }) => {
    const counts = items.reduce((acc, it) => {
      acc[it.item_type] = (acc[it.item_type] || 0) + 1;
      return acc;
    }, {});
    els.inventoryList.innerHTML = Object.entries(counts)
      .map(([type, count]) => `<span class="inv-pill">${type} x${count}</span>`)
      .join("") || '<span class="inv-empty">Nothing yet — walk over a tile to collect it</span>';
  });
}

function renderChat(messages) {
  const newOnes = messages.filter((m) => !lastChatIds.has(m.id));
  if (newOnes.length === 0 && lastChatIds.size > 0) return;

  lastChatIds = new Set(messages.map((m) => m.id));
  els.chatList.innerHTML = messages
    .map((m) => `<p><strong>${escapeHtml(m.player_name)}:</strong> ${escapeHtml(m.body)}</p>`)
    .join("");
  els.chatList.scrollTop = els.chatList.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Join flow ---------------------------------------------------

els.joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = els.joinInput.value.trim();
  if (!name) return;

  try {
    const { player } = await api.joinGame(name, 320, 340);
    localPlayer = player;
    els.joinOverlay.classList.add("hidden");
    updateHud();
    startLoops();
  } catch (err) {
    els.joinError.textContent = err.message;
  }
});

// --- Chat ----------------------------------------------------------

els.chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = els.chatInput.value.trim();
  if (!body || !localPlayer) return;
  els.chatInput.value = "";
  try {
    await api.postChat(localPlayer.id, body);
    const { messages } = await api.getChat();
    renderChat(messages);
  } catch (err) {
    console.error("chat failed:", err.message);
  }
});

// --- Battle trigger (Enter key while near the NPC) ------------------

window.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !localPlayer || battle.isOpen) return;
  if (plaza.isNearNpc(localPlayer, npc)) {
    battle.open(localPlayer.id);
  }
});

// --- Loops -----------------------------------------------------------

function startLoops() {
  // Smooth local loop: runs every frame (not a fixed 100ms tick), using
  // real elapsed time so movement speed is consistent regardless of
  // frame rate, and so other players' positions can be interpolated
  // smoothly frame by frame instead of just on poll ticks.
  let lastFrameTime = performance.now();

  function frame(now) {
    const deltaSeconds = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (localPlayer && !battle.isOpen) {
      plaza.applyMovement(localPlayer, deltaSeconds);

      const collected = plaza.checkCollectibles(localPlayer);
      for (const item of collected) {
        api.collectItem(localPlayer.id, item.type)
          .then(renderInventoryCount)
          .catch((err) => console.error("collect failed:", err.message));
      }

      els.hint.textContent = plaza.isNearNpc(localPlayer, npc)
        ? "Press Enter to talk to the Old Sage"
        : "Arrow keys to move · walk over a tile to collect it";

      plaza.render({ localPlayer, npc });
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Sync tick: tell the server where we are, find out where everyone
  // else is. This is the "polling every 1-2 seconds" from the plan —
  // positions from here feed PlazaScene's interpolation, not the
  // render loop directly, so movement still looks smooth between polls.
  setInterval(async () => {
    if (!localPlayer) return;
    try {
      await api.updatePosition(localPlayer.id, localPlayer.x, localPlayer.y);
      const { players, npc: npcState } = await api.getState();
      plaza.setRemotePlayers(players, POSITION_POLL_MS, localPlayer.id);
      npc = npcState;
    } catch (err) {
      console.error("position sync failed:", err.message);
    }
  }, POSITION_POLL_MS);

  // Chat poll.
  setInterval(async () => {
    try {
      const { messages } = await api.getChat();
      renderChat(messages);
    } catch (err) {
      console.error("chat poll failed:", err.message);
    }
  }, CHAT_POLL_MS);

  renderInventoryCount();
}
