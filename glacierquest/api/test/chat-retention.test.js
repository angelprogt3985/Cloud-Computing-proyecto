const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryStore } = require('../src/store');
const { RealtimeStore } = require('../src/realtime');
const { FirestoreStore } = require('../src/firestore');
const { PostgresStore } = require('../src/postgres');
const { CHAT_TTL_MS } = require('../src/chat-policy');

test('local chat distinguishes duplicate names, expires, and shares only avatar presence', async () => {
  let now = 1000000;
  const store = new MemoryStore({ now: () => now });
  const player = { id: 'one', name: 'Pingu', avatar: { color: 'blue', hat: 'beanie' }, coins: 100 };
  const first = await store.chat(player, 'Hola');
  const second = await store.chat({ ...player, id: 'two' }, 'También soy Pingu');
  assert.equal(first.player_id, 'one'); assert.equal(second.player_id, 'two');
  await store.heartbeat(player, { x: 1, y: 2 });
  const room = await store.room();
  assert.deepEqual(room.players[0].avatar, player.avatar);
  assert.equal(room.players[0].coins, undefined);
  room.players[0].avatar.color = 'tampered';
  assert.equal((await store.room()).players[0].avatar.color, 'blue');
  now += CHAT_TTL_MS;
  assert.deepEqual((await store.room()).messages, []);
  assert.equal(store.messages.length, 0);
});

test('RTDB queries only recent messages and expires cached messages without another read', async () => {
  let now = 1000000;
  const queries = [];
  const store = new RealtimeStore({
    url: 'https://demo-test.firebaseio.com', now: () => now,
    auth: { getAccessToken: async () => 'mock-token' },
    fetcher: async request => {
      const url = new URL(request); queries.push(url);
      const data = url.pathname.includes('gq_chat') ? {
        old: { id: 'old', createdAt: now - CHAT_TTL_MS },
        recent: { id: 'recent', createdAt: now - CHAT_TTL_MS + 100 },
        invalid: { id: 'invalid', createdAt: 'yesterday' },
        future: { id: 'future', createdAt: now + 999999 }
      } : {};
      return new Response(JSON.stringify(data));
    }
  });
  assert.deepEqual((await store.room()).messages.map(m => m.id), ['recent']);
  const chat = queries.find(url => url.pathname.includes('gq_chat'));
  assert.equal(chat.searchParams.get('orderBy'), '"createdAt"');
  assert.equal(Number(chat.searchParams.get('startAt')), now - CHAT_TTL_MS);
  assert.equal(chat.searchParams.get('limitToLast'), '30');
  now += 100;
  assert.deepEqual((await store.room()).messages, []);
  assert.equal(queries.length, 2, 'retention does not require extra cloud reads');
});

test('RTDB publishes verified player ID and avatar, cleanup uses the same two-minute cutoff', async () => {
  const now = 1000000, writes = [], queries = [];
  const store = new RealtimeStore({
    url: 'https://demo-test.firebaseio.com', now: () => now,
    auth: { getAccessToken: async () => 'mock-token' },
    fetcher: async (request, options) => {
      const url = new URL(request); queries.push(url);
      if (options.body) writes.push({ path: url.pathname, body: JSON.parse(options.body) });
      return new Response('null');
    }
  });
  const player = { id: 'verified-id', name: 'Pingu', avatar: { color: 'teal' } };
  const sent = await store.chat(player, 'Hola');
  await store.heartbeat(player, { x: 5, y: 8 });
  assert.equal(sent.player_id, player.id);
  assert.equal(writes[0].body.player_id, player.id);
  assert.deepEqual(writes[1].body.avatar, player.avatar);
  assert.deepEqual(await store.cleanup(), { gq_presence: 0, gq_chat: 0 });
  const cleanup = queries.find(url => url.pathname === '/gq_chat.json');
  assert.equal(Number(cleanup.searchParams.get('endAt')), now - CHAT_TTL_MS);
  assert.equal(cleanup.searchParams.get('limitToFirst'), '20');
});

test('Firestore also hides expired records in a warm cache and constrains its query', async () => {
  let now = 1000000, reads = 0;
  const filters = [];
  const store = new FirestoreStore({ collection: name => {
    const q = {
      where: (...args) => { filters.push({ name, args }); return q; },
      orderBy: () => q, limit: () => q,
      get: async () => { reads++; return { docs: name === 'gq_chat'
        ? [{ data: () => ({ id: 'old', createdAt: now - CHAT_TTL_MS - 1 }) },
          { data: () => ({ id: 'recent', createdAt: now - CHAT_TTL_MS + 100 }) }] : [] }; }
    };
    return q;
  } }, { now: () => now });
  assert.deepEqual((await store.room()).messages.map(m => m.id), ['recent']);
  assert.deepEqual(filters.find(f => f.name === 'gq_chat').args, ['createdAt', '>', now - CHAT_TTL_MS]);
  now += 100;
  assert.deepEqual((await store.room()).messages, []);
  assert.equal(reads, 2);
});

test('Postgres bounds chat history and returns avatar from persisted profile without a schema change', async () => {
  const queries = [], now = Date.now();
  const pool = { query: async (query, values) => {
    queries.push({ query, values });
    if (query.startsWith('INSERT')) return { rows: [] };
    return { rows: query.includes('FROM gq_chat') ? [
      { data: { id: 'old', createdAt: now - CHAT_TTL_MS } },
      { data: { id: 'recent', createdAt: now - 10 } }
    ] : [{ id: 'p', avatar: { color: 'teal' }, level: 2 }] };
  } };
  const store = new PostgresStore(pool);
  const room = await store.room();
  assert.deepEqual(room.messages.map(m => m.id), ['recent']);
  assert.deepEqual(room.players[0].avatar, { color: 'teal' });
  assert.match(queries[0].query, /LEFT JOIN gq_players/);
  assert.match(queries[1].query, /created_at > now\(\) - interval '2 minutes'/);
  await store.chat({ id: 'verified-id', name: 'Pingu' }, 'Hola');
  assert.equal(JSON.parse(queries[2].values[1]).player_id, 'verified-id');
});
