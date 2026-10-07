// Use only with the official Firestore emulator, never silently with production.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FirestoreStore } = require('../src/store');
const { newPlayer, startBattle, battleTurn } = require('../src/game');
test('Firestore persists across clients and serializes concurrent turns',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
  process.env.GCLOUD_PROJECT ||= 'glacierquest-test';
  const one=new FirestoreStore(),two=new FirestoreStore();const p=startBattle({...newPlayer('test'),x:520,y:160});
  try {
    await one.create(p);assert.equal((await two.get(p.id)).name,'test');
    const results=await Promise.allSettled([one,two].map(s=>s.mutate(p.id,x=>battleTurn(x,'attack',p.battle.id,0))));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await one.get(p.id)).battle.turn,1);
  } finally { await one.ref(p.id).delete(); await one.db.terminate();await two.db.terminate(); }
});
