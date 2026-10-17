const { randomUUID } = require('node:crypto');
const { fail } = require('./game');
const { CHAT_TTL_MS, recentMessages, recentRoom } = require('./chat-policy');

// Server SDK only: the browser never receives database credentials.
class FirestoreStore {
  constructor(db, { now = Date.now } = {}) {
    this.kind = 'firestore';
    this.db = db || new (require('@google-cloud/firestore').Firestore)();
    this.now = now;
    this.presenceWrites = new Map();
    this.roomCache = null;
    this.roomPending = null;
  }
  players() { return this.db.collection('gq_players'); }
  async create(p) { await this.players().doc(p.id).create(p); }
  async get(id) { return (await this.players().doc(id).get()).data(); }
  async mutate(id, fn) {
    const ref = this.players().doc(id);
    // The callback may run again on contention; never publish messages inside it.
    return this.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail(401, 'Sesión expirada; vuelve a entrar');
      const next = fn(snap.data());
      tx.set(ref, next);
      return next;
    });
  }
  async heartbeat(p, pos) {
    const now = this.now();
    const previous = this.presenceWrites.get(p.id);
    if (previous && (previous.pending || now - previous.at < 10000)) return previous.pending;
    for (const [id, entry] of this.presenceWrites) {
      if (!entry.pending && now - entry.at > 60000) this.presenceWrites.delete(id);
    }
    const entry = { at: now };
    entry.pending = this.db.collection('gq_presence').doc(p.id).set({
      id: p.id, name: p.name, level: p.level || 1, avatar: p.avatar || null, x: pos.x, y: pos.y, seenAt: now
    });
    this.presenceWrites.set(p.id, entry);
    try { await entry.pending; entry.pending = null; }
    catch (err) { this.presenceWrites.delete(p.id); throw err; }
  }
  async room() {
    const now = this.now();
    if (this.roomCache && now - this.roomCache.at < 10000) return recentRoom(this.roomCache.value, now);
    if (!this.roomPending) {
      this.roomPending = Promise.all([
        this.db.collection('gq_presence').where('seenAt', '>', now - 30000).orderBy('seenAt', 'desc').limit(40).get(),
        this.db.collection('gq_chat').where('createdAt', '>', now - CHAT_TTL_MS).orderBy('createdAt', 'desc').limit(30).get()
      ]).then(([people, chat]) => {
        const value = { players: people.docs.map(d => d.data()), messages: recentMessages(chat.docs.map(d => d.data()), this.now()) };
        this.roomCache = { at: this.now(), value };
        return value;
      }).finally(() => { this.roomPending = null; });
    }
    return recentRoom(await this.roomPending, this.now());
  }
  async chat(p, body) {
    const m = { id: randomUUID(), player_id: p.id, player_name: p.name, body, createdAt: this.now() };
    await this.db.collection('gq_chat').doc(m.id).create(m);
    this.roomCache = null;
    return m;
  }
  async health() { await this.players().limit(1).get(); return true; }
  async close() { await this.db.terminate(); }
}
module.exports = { FirestoreStore };
