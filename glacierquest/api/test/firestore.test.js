const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FirestoreStore } = require('../src/firestore');

test('presence coalesces concurrent writes, throttles and retries failures', async () => {
  let now = 100000, writes = 0, release, reject;
  const db = { collection: () => ({ doc: () => ({ set: () => {
    writes++; return new Promise((ok, no) => { release = ok; reject = no; });
  } }) }) };
  const store = new FirestoreStore(db, { now: () => now });
  const player = { id: 'p', name: 'P' }, pos = { x: 1, y: 2 };
  const a = store.heartbeat(player, pos), b = store.heartbeat(player, pos);
  assert.equal(writes, 1); release(); await Promise.all([a, b]);
  now += 5000; await store.heartbeat(player, pos); assert.equal(writes, 1);
  now += 5000; const c = store.heartbeat(player, pos); reject(new Error('offline'));
  await assert.rejects(c, /offline/);
  const d = store.heartbeat(player, pos); assert.equal(writes, 3); release(); await d;
});

test('room cache shares queries, returns isolated data, expires and retries', async () => {
  let now = 100000, reads = 0, broken = false;
  const q = { where: () => q, orderBy: () => q, limit: () => q,
    get: async () => { reads++; if (broken) throw new Error('offline'); return { docs: [{ data: () => ({ id: 'p' }) }] }; } };
  const store = new FirestoreStore({ collection: () => q }, { now: () => now });
  const [a, b] = await Promise.all([store.room(), store.room()]);
  assert.equal(reads, 2); a.players[0].id = 'tampered'; assert.equal(b.players[0].id, 'p');
  await store.room(); assert.equal(reads, 2);
  now += 10001; broken = true; await assert.rejects(store.room(), /offline/);
  broken = false; assert.equal((await store.room()).players[0].id, 'p'); assert.equal(reads, 6);
});
