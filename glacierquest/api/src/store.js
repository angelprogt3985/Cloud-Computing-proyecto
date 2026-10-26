const { fail } = require('./game');
const { recentMessages } = require('./chat-policy');
class MemoryStore {
  constructor({ now = Date.now } = {}) { this.kind = 'memory'; this.now = now; this.players = new Map(); this.presence = new Map(); this.messages = []; }
  async create(p) { this.players.set(p.id, structuredClone(p)); }
  async createIfAbsent(p) { if (!this.players.has(p.id)) this.players.set(p.id,structuredClone(p)); return this.get(p.id); }
  async arenaGet() { return structuredClone(this.arena || null); }
  async arenaMutate(fn) { this.arena=fn(structuredClone(this.arena || null));return structuredClone(this.arena); }
  async get(id) { return structuredClone(this.players.get(id)); }
  async mutate(id, fn) {
    const p = this.players.get(id); if (!p) fail(401, 'Sesión expirada; vuelve a entrar');
    const next = fn(structuredClone(p)); this.players.set(id, structuredClone(next)); return next;
  }
  async heartbeat(p, pos) { this.presence.set(p.id, { id: p.id, name: p.name, zone: p.zone || 'plaza', level:p.level || 1, avatar: structuredClone(p.avatar || null), x: pos.x, y: pos.y, seenAt: this.now() }); }
  async room() { this.messages = recentMessages(this.messages, this.now()); return structuredClone({ players: [...this.presence.values()].filter(p => p.seenAt > this.now() - 30000).slice(0, 40), messages: this.messages }); }
  async chat(p, body) { const m = { id: require('node:crypto').randomUUID(), player_id: p.id, player_name: p.name, zone: p.zone || 'plaza', body, createdAt: this.now() }; this.messages.push(m); this.messages = recentMessages(this.messages, this.now()); return structuredClone(m); }
  async health() { return true; }
}
function createStore(kind) {
  if (kind === 'realtime') return new (require('./realtime').RealtimeStore)();
  if (kind === 'firestore') return new (require('./firestore').FirestoreStore)();
  if (kind === 'postgres') return new (require('./postgres').PostgresStore)();
  if (kind === 'memory' && (process.env.NODE_ENV !== 'production' || process.env.GQ_DEMO_MODE === 'true')) return new MemoryStore();
  throw new Error('Invalid STORE; memory requires local development or explicit demo mode');
}
module.exports = { MemoryStore, createStore };
