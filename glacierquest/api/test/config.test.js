const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../src/config');
const { createStore } = require('../src/store');

const demo = { NODE_ENV: 'production', K_SERVICE: 'glacierquest-demo', STORE: 'memory', GQ_DEMO_MODE: 'true', SESSION_SECRET: 'x'.repeat(64), DEMO_CODE: 'class-code', ASSET_BUCKET: 'private-demo-assets' };
test('Cloud demo must opt in to ephemeral storage and retain required secrets', () => {
  assert.doesNotThrow(() => validateConfig(demo));
  assert.throws(() => validateConfig({ ...demo, GQ_DEMO_MODE: undefined }), /persistent/);
  for (const key of ['SESSION_SECRET', 'DEMO_CODE', 'ASSET_BUCKET']) {
    assert.throws(() => validateConfig({ ...demo, [key]: '' }), /requires/);
  }
  assert.throws(() => validateConfig({ ...demo, SESSION_SECRET: 'short' }), /requires/);
  assert.throws(() => validateConfig({ ...demo, FIRESTORE_EMULATOR_HOST: 'localhost:8081' }), /local-only/);
});
test('Changing NODE_ENV cannot bypass validation on Cloud Run', () => {
  assert.throws(() => validateConfig({ K_SERVICE: 'glacierquest-demo', NODE_ENV: 'test' }), /requires/);
  assert.doesNotThrow(() => validateConfig({ STORE: 'memory' }));
});
test('Store factory can start the hosted demo but rejects implicit production memory', t => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldDemo = process.env.GQ_DEMO_MODE;
  t.after(() => {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldDemo === undefined) delete process.env.GQ_DEMO_MODE; else process.env.GQ_DEMO_MODE = oldDemo;
  });
  process.env.NODE_ENV = 'production';
  delete process.env.GQ_DEMO_MODE;
  assert.throws(() => createStore('memory'), /explicit demo/);
  process.env.GQ_DEMO_MODE = 'true';
  assert.equal(createStore('memory').kind, 'memory');
});
