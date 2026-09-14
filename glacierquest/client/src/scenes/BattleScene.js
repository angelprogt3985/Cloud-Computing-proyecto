import { battleAction } from "../api.js";

// Controls the battle modal's DOM directly rather than drawing it on
// canvas — much simpler for text-heavy UI, and matches the game
// screen mockup from the playbook (HUD/chat/battle are all plain
// HTML, only the map itself is canvas).
export class BattleScene {
  constructor({ overlayEl, logEl, attackBtn, runBtn, leaveBtn }, onPlayerUpdate) {
    this.overlayEl = overlayEl;
    this.logEl = logEl;
    this.onPlayerUpdate = onPlayerUpdate;
    this.playerId = null;

    attackBtn.addEventListener("click", () => this._act("attack"));
    runBtn.addEventListener("click", () => this._act("run"));
    leaveBtn.addEventListener("click", () => this.close());
  }

  open(playerId) {
    this.playerId = playerId;
    this.logEl.textContent = "The Old Sage blocks your path. Attack or Run?";
    this.overlayEl.classList.remove("hidden");
  }

  close() {
    this.overlayEl.classList.add("hidden");
    this.playerId = null;
  }

  get isOpen() {
    return !this.overlayEl.classList.contains("hidden");
  }

  async _act(action) {
    if (!this.playerId) return;
    try {
      const { message, player } = await battleAction(this.playerId, action);
      this.logEl.textContent = message;
      this.onPlayerUpdate(player);
      if (action === "run") {
        setTimeout(() => this.close(), 700);
      }
    } catch (err) {
      this.logEl.textContent = `Something went wrong: ${err.message}`;
    }
  }
}
