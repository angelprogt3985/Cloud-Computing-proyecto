const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RealtimeStore } = require('../src/realtime');
const { newPlayer, collect, startBattle, battleTurn } = require('../src/game');
const auth = { getAccessToken: async () => 'test-token' };
const url = 'https://demo-test.firebaseio.com';
function scripted(responses, checks = []) {
  return new RealtimeStore({ url, auth, now: () => 2000000000, fetcher: async (request, options) => {
    const response = responses.shift(); assert.ok(response, 'unexpected extra request');
    checks.push({ url: new URL(request), ...options });
    return new Response(JSON.stringify(response.value ?? null), { status: response.status || 200, headers: response.etag ? { etag: response.etag } : {} });
  } });
}
test('Firebase empty arrays are normalized before collection and persisted', async () => {
  const p = newPlayer('A'); delete p.collected; delete p.battle; p.x = 120; p.y = 320;
  const checks = []; const store = scripted([{ value: p, etag: 'v1' }, { value: null }], checks);
  const next = await store.mutate(p.id, value => collect(value, 'c1'));
  assert.equal(next.coins, 3); assert.deepEqual(next.collected, ['c1']);
  assert.equal(checks[1].headers['if-match'], 'v1');
  assert.equal(JSON.parse(checks[1].body).coins, 3);
});
test('ETag conflict revalidates stale battle turn and cannot award twice', async () => {
  let p = newPlayer('A'); p.x = 520; p.y = 160; p = startBattle(p); p.battle.hp = 1;
  const requestTurn = p.battle.turn; const battleId = p.battle.id;
  const won = battleTurn(structuredClone(p), 'attack', battleId, requestTurn);
  const checks = []; const store = scripted([{ value: p, etag: 'v1' }, { status: 412 }, { value: won, etag: 'v2' }], checks);
  await assert.rejects(store.mutate(p.id, value => battleTurn(value, 'attack', battleId, requestTurn)), { status: 409 });
  assert.equal(checks.filter(c => c.method === 'PUT').length, 1);
});
test('Cleanup skips a reconnected player and preserves a concurrent heartbeat', async () => {
  const checks = []; const now = 2000000000;
  const store = scripted([
    { value: { reconnect: { seenAt: 1 }, race: { seenAt: 1 }, old: { seenAt: 1 } } },
    { value: { seenAt: now }, etag: 'new' },
    { value: { seenAt: 1 }, etag: 'old-race' }, { status: 412 },
    { value: { seenAt: 1 }, etag: 'old' }, {},
    { value: { message: { createdAt: 1 } } },
    { value: { createdAt: 1 }, etag: 'chat' }, {}
  ], checks);
  assert.deepEqual(await store.cleanup(), { gq_presence: 1, gq_chat: 1 });
  assert.ok(checks.every(c => !c.url.pathname.includes('gq_players')));
  assert.equal(checks.filter(c => c.method === 'DELETE').length, 3);
  assert.ok(checks.filter(c => c.method === 'DELETE').every(c => c.headers['if-match']));
  assert.equal(checks[0].url.searchParams.get('limitToFirst'), '20');
});
test('Room reads are bounded, cached and isolated from callers', async () => {
  const checks = [];
  const store = scripted([{ value: { p: { id: 'p' } } }, { value: { newer: { createdAt: 1999999999 }, older: { createdAt: 1999999998 } } }], checks);
  const room = await store.room(); room.players[0].id = 'changed';
  assert.equal((await store.room()).players[0].id, 'p');
  assert.deepEqual(room.messages.map(m => m.createdAt), [1999999998, 1999999999]);
  assert.equal(checks[0].url.searchParams.get('limitToLast'), '40');
  assert.equal(checks[1].url.searchParams.get('limitToLast'), '30');
});
test('Database cannot send credentials to an arbitrary URL', () => {
  assert.throws(() => new RealtimeStore({ url: 'https://example.com', auth }), /Firebase/);
  assert.throws(() => new RealtimeStore({ url: 'http://demo-test.firebaseio.com', auth }), /Firebase/);
});

test('Cleanup stops before starting more requests when its time budget expires', async () => {
  let now = 2000000000; let requests = 0;
  const store = new RealtimeStore({ url, auth, now: () => now, fetcher: async () => {
    requests++; now += 16000;
    return new Response(JSON.stringify({ old: { seenAt: 1 } }));
  } });
  assert.deepEqual(await store.cleanup(), { gq_presence: 0, gq_chat: 0 });
  assert.equal(requests, 1);
});
