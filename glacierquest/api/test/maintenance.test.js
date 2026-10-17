const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { MemoryStore } = require('../src/store');

test('Public cleanup route denies forged scheduler headers and game sessions', async t => {
  let called = 0; const store = new MemoryStore();
  store.cleanup = async () => { called++; return {}; };
  const app = createApp({ store, secret: 'test-secret', logger: () => {} });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const headers of [{}, { 'X-CloudScheduler': 'true' }, { Authorization: 'Bearer fake-game-session' }]) {
    assert.equal((await fetch(base + '/internal/cleanup', { method: 'POST', headers })).status, 403);
  }
  assert.equal(called, 0);
});
