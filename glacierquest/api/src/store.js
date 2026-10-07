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
class FirestoreStore {
  constructor() {
    const { Firestore } = require('@google-cloud/firestore');
    this.db = new Firestore({ databaseId: '(default)' }); this.kind = 'firestore';
  }
  ref(id) { return this.db.collection('players').doc(id); }
  async create(p) { await this.ref(p.id).create(p); }
  async get(id) { return (await this.ref(id).get()).data(); }
  async mutate(id, fn) {
    return this.db.runTransaction(async tx => {
      const ref = this.ref(id); const snap = await tx.get(ref);
      if (!snap.exists) fail(401, 'Sesión expirada; vuelve a entrar');
      const next = fn(snap.data()); tx.set(ref, next); return next;
    });
  }
  async heartbeat(p, pos) { await this.db.collection('presence').doc(p.id).set({ id: p.id, name: p.name, x: pos.x, y: pos.y, seenAt: Date.now() }); }
  async room() {
    const [people, chat] = await Promise.all([
      this.db.collection('presence').where('seenAt', '>', Date.now() - 30000).orderBy('seenAt', 'desc').limit(40).get(),
      this.db.collection('rooms').doc('plaza').get()
    ]);
    return { players: people.docs.map(d => d.data()), messages: chat.data()?.messages || [] };
  }
  async chat(p, body) {
    const m = { id: require('node:crypto').randomUUID(), player_name: p.name, body, createdAt: Date.now() };
    const ref = this.db.collection('rooms').doc('plaza');
    await this.db.runTransaction(async tx => { const snap = await tx.get(ref); tx.set(ref, { messages: [...(snap.data()?.messages || []), m].slice(-30) }); });
    return m;
  }
  async health() { await this.db.collection('rooms').doc('plaza').get(); return true; }
}
function createStore(kind) {
  if (kind === 'firestore') return new FirestoreStore();
  if (kind === 'memory' && process.env.NODE_ENV !== 'production') return new MemoryStore();
  throw new Error('Invalid STORE; memory is local-only');
}
module.exports = { MemoryStore, FirestoreStore, createStore };
