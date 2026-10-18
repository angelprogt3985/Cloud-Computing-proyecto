const { randomUUID } = require('node:crypto');
const { GoogleAuth } = require('google-auth-library');
const { fail } = require('./game');
const { CHAT_TTL_MS, recentMessages, recentRoom } = require('./chat-policy');

function normalizePlayer(value) {
  return value ? require('./expedition').normalize({ ...value, collected: value.collected || [], battle: value.battle || null }) : undefined;
}

// REST keeps requests finite: no permanent database listener holding Cloud Run open.
class RealtimeStore {
  constructor({ url = process.env.FIREBASE_DATABASE_URL, fetcher = fetch, auth, now = Date.now } = {}) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.(firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)$/.test(parsed.hostname) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error('Expected a root HTTPS Firebase Realtime Database URL');
    }
    this.kind = 'realtime'; this.url = parsed.origin; this.fetcher = fetcher; this.now = now;
    this.auth = auth || new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase.database', 'https://www.googleapis.com/auth/userinfo.email'] });
    this.roomPending = null; this.roomCache = null;
  }
  async request(path, { method = 'GET', body, query = {}, etag, readEtag = false } = {}) {
    const url = new URL(`${this.url}/${path}.json`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, JSON.stringify(value));
    const access = await this.auth.getAccessToken();
    if (!access) throw new Error('Firebase authentication unavailable');
    const response = await this.fetcher(url, {
      method, signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', ...(readEtag ? { 'X-Firebase-ETag': 'true' } : {}), ...(etag ? { 'if-match': etag } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (response.status === 412) return { conflict: true };
    if (!response.ok) { const error = new Error('Firebase request failed'); error.code = `firebase_${response.status}`; throw error; }
    return { value: response.status === 204 ? null : await response.json(), etag: response.headers.get('etag') };
  }
  async create(player) { await this.request(`gq_players/${player.id}`, { method: 'PUT', body: player }); }
  async createIfAbsent(player) {
    const path=`gq_players/${player.id}`;
    for(let i=0;i<8;i++) {
      const current=await this.request(path,{readEtag:true});
      if(current.value) return normalizePlayer(current.value);
      if(!current.etag) throw new Error('Missing ETag');
      const saved=await this.request(path,{method:'PUT',body:player,etag:current.etag});
      if(!saved.conflict) return normalizePlayer(player);
    }
    fail(409,'Vuelve a intentar el inicio de sesión');
  }
  async arenaGet() { return (await this.request('gq_arena/current')).value; }
  async arenaMutate(fn) {
    for(let i=0;i<8;i++) {
      const current=await this.request('gq_arena/current',{readEtag:true});
      if(!current.etag) throw new Error('Missing arena ETag');
      const next=fn(current.value);
      const saved=await this.request('gq_arena/current',{method:'PUT',body:next,etag:current.etag});
      if(!saved.conflict) return next;
    }
    fail(409,'La arena cambió; sincroniza e intenta de nuevo');
  }
  async get(id) { return normalizePlayer((await this.request(`gq_players/${id}`)).value); }
  async mutate(id, fn) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await this.request(`gq_players/${id}`, { readEtag: true });
      const player = normalizePlayer(current.value);
      if (!player) fail(401, 'Sesión expirada; vuelve a entrar');
      if (!current.etag) throw new Error('Firebase transaction requires an ETag');
      // Re-run domain validation on contention: a stale turn cannot award twice.
      const next = fn(player);
      const saved = await this.request(`gq_players/${id}`, { method: 'PUT', body: next, etag: current.etag });
      if (!saved.conflict) return normalizePlayer(next);
    }
    fail(409, 'Otra acción está actualizando tu partida; vuelve a intentar');
  }
  async heartbeat(player, position) {
    await this.request(`gq_presence/${player.id}`, { method: 'PUT', body: { id: player.id, name: player.name, level:player.level || 1, avatar: player.avatar || null, x: position.x, y: position.y, seenAt: this.now() } });
  }
  async room() {
    if (this.roomCache && this.now() - this.roomCache.at < 500) return recentRoom(this.roomCache.value, this.now());
    if (!this.roomPending) {
      this.roomPending = Promise.all([
        this.request('gq_presence', { query: { orderBy: 'seenAt', startAt: this.now() - 30000, limitToLast: 40 } }),
        this.request('gq_chat', { query: { orderBy: 'createdAt', startAt: this.now() - CHAT_TTL_MS, limitToLast: 30 } })
      ]).then(([people, chat]) => {
        const value = { players: Object.values(people.value || {}), messages: recentMessages(Object.values(chat.value || {}), this.now()) };
        this.roomCache = { at: this.now(), value }; return value;
      }).finally(() => { this.roomPending = null; });
    }
    return recentRoom(await this.roomPending, this.now());
  }
  async chat(player, body) {
    const message = { id: randomUUID(), player_id: player.id, player_name: player.name, body, createdAt: this.now() };
    await this.request(`gq_chat/${message.id}`, { method: 'PUT', body: message });
    this.roomCache = null; return message;
  }
  async health() { await this.request('gq_health'); return true; }
  async cleanup() {
    // Only transient records: never delete players, inventory or progress.
    const deadline = this.now() + 15000;
    const cutoffs = { gq_presence: { field: 'seenAt', cutoff: this.now() - 60000 }, gq_chat: { field: 'createdAt', cutoff: this.now() - CHAT_TTL_MS } };
    const removed = { gq_presence: 0, gq_chat: 0 };
    for (const [collection, { field, cutoff }] of Object.entries(cutoffs)) {
      if (this.now() >= deadline) break;
      const candidates = await this.request(collection, { query: { orderBy: field, endAt: cutoff, limitToFirst: 20 } });
      for (const id of Object.keys(candidates.value || {})) {
        if (this.now() >= deadline) break;
        const path = `${collection}/${id}`;
        const current = await this.request(path, { readEtag: true });
        if (this.now() >= deadline) break;
        if (!current.value || !Number.isFinite(current.value[field]) || current.value[field] > cutoff) continue;
        if (!current.etag) throw new Error('Cleanup requires an ETag');
        const result = await this.request(path, { method: 'DELETE', etag: current.etag });
        if (!result.conflict) removed[collection]++;
      }
    }
    this.roomCache = null; return removed;
  }
}
module.exports = { RealtimeStore, normalizePlayer };
