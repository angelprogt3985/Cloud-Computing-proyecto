const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { PostgresStore } = require('../src/postgres');
const { newPlayer, startBattle, battleTurn } = require('../src/game');
test('PostgreSQL persists across connections and locks concurrent turns', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  // Point TEST_DATABASE_URL only at a disposable local/test database with schema applied.
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 4, connectionTimeoutMillis: 3000 });
  const a = new PostgresStore(pool), b = new PostgresStore(pool);
  const p = startBattle({ ...newPlayer('SQL test'), x: 520, y: 160 });
  try {
    await a.create(p); assert.equal((await b.get(p.id)).name, 'SQL test');
    const results = await Promise.allSettled([a,b].map(s => s.mutate(p.id, x => battleTurn(x, 'attack', p.battle.id, 0))));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await b.get(p.id)).battle.turn, 1);
    await a.heartbeat(p,p); assert.ok((await b.room()).players.some(x => x.id === p.id));
  } finally { await pool.query('DELETE FROM gq_players WHERE id=$1', [p.id]); await pool.end(); }
});
