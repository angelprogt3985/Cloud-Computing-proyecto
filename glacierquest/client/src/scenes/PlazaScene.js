// The single shared room. Circles/squares by default, but supports
// dropping in real sprite images with zero further code changes — see
// spriteConfig.js.

import { SPRITES } from "./spriteConfig.js";

export const MAP_WIDTH = 640;
export const MAP_HEIGHT = 400;
const MOVE_SPEED = 160; // px/second — replaces the old fixed-step movement
const NPC_TALK_RADIUS = 36;
const COLLECT_RADIUS = 20;

// Fixed collectible spots. Collection state lives only in the browser
// tab for this session (not persisted server-side per-tile) — a
// deliberate simplification: the server just counts total items
// collected per player, not which specific tile they came from.
export const COLLECTIBLES = [
  { id: "c1", x: 120, y: 320, type: "coin" },
  { id: "c2", x: 560, y: 340, type: "coin" },
  { id: "c3", x: 60, y: 80, type: "fish" }
];

const PLAYER_COLORS = ["#185FA5", "#3B6D11", "#B3541E", "#7C3AED", "#0F6E56"];

function colorForPlayer(id) {
  return PLAYER_COLORS[id % PLAYER_COLORS.length];
}

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export class PlazaScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.collected = new Set();
    this.keysDown = new Set();

    // playerId -> { fromX, fromY, toX, toY, tStart, duration, name, level, coins }
    // Lets other players glide between polled positions instead of
    // snapping to a new spot every 1.5 seconds.
    this.remotePlayers = new Map();

    // Lazily loaded sprite images, keyed the same as SPRITES. Empty by
    // default (see spriteConfig.js) — falls back to shapes until you
    // drop real asset files in and fill that file out.
    this.sprites = {};
    for (const [key, src] of Object.entries(SPRITES)) {
      if (src) this.sprites[key] = loadImage(src);
    }

    window.addEventListener("keydown", (e) => this.keysDown.add(e.key));
    window.addEventListener("keyup", (e) => this.keysDown.delete(e.key));
  }

  // Moves the local player using real elapsed time (deltaSeconds)
  // instead of a fixed pixel step per tick, so movement speed doesn't
  // depend on how often this is called — and diagonal movement is
  // normalized so it isn't faster than moving straight.
  applyMovement(localPlayer, deltaSeconds) {
    let dx = 0;
    let dy = 0;
    if (this.keysDown.has("ArrowUp")) dy -= 1;
    if (this.keysDown.has("ArrowDown")) dy += 1;
    if (this.keysDown.has("ArrowLeft")) dx -= 1;
    if (this.keysDown.has("ArrowRight")) dx += 1;

    if (dx === 0 && dy === 0) return false;

    const length = Math.hypot(dx, dy);
    const distance = MOVE_SPEED * deltaSeconds;
    let x = localPlayer.x + (dx / length) * distance;
    let y = localPlayer.y + (dy / length) * distance;

    x = Math.max(16, Math.min(MAP_WIDTH - 16, x));
    y = Math.max(16, Math.min(MAP_HEIGHT - 16, y));

    localPlayer.x = x;
    localPlayer.y = y;
    return true;
  }

  // Called every ~1.5s (POSITION_POLL_MS) with the fresh server data.
  // Sets up an interpolation target for each remote player rather than
  // jumping straight to the new position.
  setRemotePlayers(players, pollIntervalMs, localPlayerId) {
    const now = performance.now();
    const seenIds = new Set();

    for (const p of players) {
      if (p.id === localPlayerId) continue;
      seenIds.add(p.id);

      const existing = this.remotePlayers.get(p.id);
      const currentPos = existing ? this._interpolatedPos(existing, now) : { x: p.x, y: p.y };

      this.remotePlayers.set(p.id, {
        fromX: currentPos.x,
        fromY: currentPos.y,
        toX: p.x,
        toY: p.y,
        tStart: now,
        duration: pollIntervalMs,
        name: p.name,
        id: p.id
      });
    }

    // Anyone no longer returned by the server (gone quiet for 30s+)
    // stops being drawn.
    for (const id of this.remotePlayers.keys()) {
      if (!seenIds.has(id)) this.remotePlayers.delete(id);
    }
  }

  _interpolatedPos(entry, now) {
    const t = Math.min(1, (now - entry.tStart) / entry.duration);
    return {
      x: entry.fromX + (entry.toX - entry.fromX) * t,
      y: entry.fromY + (entry.toY - entry.fromY) * t
    };
  }

  distanceTo(localPlayer, point) {
    return Math.hypot(localPlayer.x - point.x, localPlayer.y - point.y);
  }

  isNearNpc(localPlayer, npc) {
    if (!npc) return false;
    return this.distanceTo(localPlayer, npc) < NPC_TALK_RADIUS;
  }

  // Checks uncollected tiles under the local player and returns the
  // ones just walked over, so main.js can fire the API call for each.
  checkCollectibles(localPlayer) {
    const newlyCollected = [];
    for (const item of COLLECTIBLES) {
      if (this.collected.has(item.id)) continue;
      if (this.distanceTo(localPlayer, item) < COLLECT_RADIUS) {
        this.collected.add(item.id);
        newlyCollected.push(item);
      }
    }
    return newlyCollected;
  }

  render({ localPlayer, npc }) {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Background
    ctx.fillStyle = "#E6F1FB";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.strokeStyle = "#B5D4F4";
    ctx.strokeRect(0.5, 0.5, MAP_WIDTH - 1, MAP_HEIGHT - 1);

    // Collectibles
    for (const item of COLLECTIBLES) {
      if (this.collected.has(item.id)) continue;
      this._drawSpriteOrShape(this.sprites[item.type], item.x, item.y, 20, () => {
        ctx.fillStyle = item.type === "fish" ? "#9FE1CB" : "#FAC775";
        ctx.strokeStyle = item.type === "fish" ? "#0F6E56" : "#BA7517";
        ctx.beginPath();
        ctx.roundRect(item.x - 8, item.y - 8, 16, 16, 3);
        ctx.fill();
        ctx.stroke();
      });
    }

    // NPC
    if (npc) {
      this._drawSpriteOrShape(this.sprites.npc, npc.x, npc.y, 34, () => {
        ctx.fillStyle = "#AFA9EC";
        ctx.strokeStyle = "#534AB7";
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      this._label(npc.x, npc.y + 30, npc.name, "#3C3489");
    }

    // Other players, at their interpolated (smoothly gliding) position
    for (const entry of this.remotePlayers.values()) {
      const pos = this._interpolatedPos(entry, now);
      this._drawPlayer(pos.x, pos.y, entry.name, colorForPlayer(entry.id));
    }

    // Local player drawn last so it's never hidden behind others
    if (localPlayer) {
      this._drawPlayer(localPlayer.x, localPlayer.y, localPlayer.name, colorForPlayer(localPlayer.id));
    }
  }

  _drawSpriteOrShape(img, x, y, size, drawShapeFn) {
    if (img && img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      drawShapeFn();
    }
  }

  _drawPlayer(x, y, name, color) {
    this._drawSpriteOrShape(this.sprites.player, x, y, 36, () => {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#20242B";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    this._label(x, y + 32, name, "#20242B");
  }

  _label(x, y, text, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = "11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  }
}

