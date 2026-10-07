const { fail } = require('./game');
class MemoryStore {
  constructor() { this.kind = 'memory'; this.players = new Map(); this.presence = new Map(); this.messages = []; }
  async create(p) { this.players.set(p.id, structuredClone(p)); }
  async get(id) { return structuredClone(this.players.get(id)); }
  async mutate(id, fn) {
    const p = this.players.get(id); if (!p) fail(401, 'Sesión expirada; vuelve a entrar');
    const next = fn(structuredClone(p)); this.players.set(id, structuredClone(next)); return next;
  }
  async heartbeat(p, pos) { this.presence.set(p.id, { id: p.id, name: p.name, x: pos.x, y: pos.y, seenAt: Date.now() }); }
  async room() { return { players: [...this.presence.values()].filter(p => p.seenAt > Date.now() - 30000).slice(0, 40), messages: this.messages.slice(-30) }; }
  async chat(p, body) { const m = { id: require('node:crypto').randomUUID(), player_name: p.name, body, createdAt: Date.now() }; this.messages.push(m); this.messages = this.messages.slice(-30); return m; }
  async health() { return true; }
}
function createStore(kind) {
  if (kind === 'postgres') return new (require('./postgres').PostgresStore)();
  if (kind === 'memory' && process.env.NODE_ENV !== 'production') return new MemoryStore();
  throw new Error('Invalid STORE; memory is local-only');
}
module.exports = { MemoryStore, createStore };
