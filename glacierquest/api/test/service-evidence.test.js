const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serviceEvidence } = require('../src/service-evidence');

test('Service evidence distinguishes actual probes from configuration without exposing secrets', () => {
  const rows = serviceEvidence({ kind: 'realtime', databaseOk: true, asset: { source: 'Google Cloud Storage', at: 1000 }, cleanup: true,
    env: { K_SERVICE: 'demo', SESSION_SECRET: 'never-expose', DEMO_CODE: 'private-code', CLEANUP_SERVICE_ACCOUNT: 'scheduler', CLEANUP_AUDIENCE: 'demo' } });
  const get = name => rows.find(row => row.name === name);
  assert.equal(get('Firebase Realtime Database').state, 'verified');
  assert.equal(get('Cloud Storage').state, 'verified');
  assert.equal(get('Cloud Run').state, 'configured');
  assert.equal(get('Cloud Scheduler').state, 'configured');
  for (const name of ['IAM', 'Secret Manager', 'Logging + Monitoring', 'Cloud Build', 'GitHub Actions']) assert.equal(get(name).state, 'pending');
  assert.doesNotMatch(JSON.stringify(rows), /never-expose|private-code/);
});

test('Failed probes cannot look verified and local mode does not claim cloud integration', () => {
  const failed = serviceEvidence({ kind: 'realtime', databaseOk: false, env: {} });
  assert.equal(failed.find(row => row.name === 'Firebase Realtime Database').state, 'error');
  assert.equal(failed.find(row => row.name === 'Cloud Storage').state, 'error');
  const local = serviceEvidence({ kind: 'memory', databaseOk: true, asset: { source: 'archivo local', at: 1000 }, env: {} });
  assert.equal(local.filter(row => row.state === 'verified').length, 0);
  assert.equal(local.find(row => row.name === 'Cloud Run').state, 'local');
});
