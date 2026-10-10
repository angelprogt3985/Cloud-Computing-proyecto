const { createApp } = require('./app');
const { createStore } = require('./store');
const { randomBytes } = require('node:crypto');
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !['postgres', 'firestore'].includes(process.env.STORE) || !process.env.ASSET_BUCKET || !process.env.DEMO_CODE) throw new Error('Production requires a persistent STORE, ASSET_BUCKET, DEMO_CODE and SESSION_SECRET (32+ characters)');
  if (process.env.STORE === 'postgres' && (!process.env.DB_HOST || !process.env.DB_PASSWORD)) throw new Error('PostgreSQL requires credentials');
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('The emulator is local-only');
}
const store = createStore(process.env.STORE || 'memory');
const app = createApp({ store, secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), demoCode: process.env.DEMO_CODE });
const server = app.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log(JSON.stringify({ severity: 'INFO', event: 'server_started', store: store.kind })));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
