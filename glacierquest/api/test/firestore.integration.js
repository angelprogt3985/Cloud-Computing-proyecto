const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FirestoreStore } = require('../src/firestore');
const { newPlayer, startBattle, battleTurn } = require('../src/game');

test('Firestore emulator: concurrent turns, persistence and single reward', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async t => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(127\.0\.0\.1|localhost):\d+$/);
  const { Firestore } = require('@google-cloud/firestore');
  const store = new FirestoreStore(new Firestore({ projectId: 'demo-glacierquest' }));
  const p = startBattle(Object.assign(newPlayer('Emulator'), { x: 520, y: 160 }));
  t.after(async () => { await store.players().doc(p.id).delete(); await store.close(); });
  await store.create(p);
  const turn = () => store.mutate(p.id, x => battleTurn(x, 'attack', p.battle.id, 0));
  const results = await Promise.allSettled([turn(), turn()]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(results.find(x => x.status === 'rejected').reason.status, 409);
  let current = await store.get(p.id);
  for (const action of ['attack', 'defend', 'attack', 'attack']) {
    current = await store.mutate(p.id, x => battleTurn(x, action, current.battle.id, current.battle.turn));
  }
  assert.equal(current.battle.status, 'won'); assert.equal(current.coins, 10);
  await assert.rejects(store.mutate(p.id, x => battleTurn(x, 'attack', current.battle.id, current.battle.turn)), { status: 409 });
  assert.equal((await store.get(p.id)).coins, 10);
});
