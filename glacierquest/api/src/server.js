const { createApp } = require('./app');
const { createStore } = require('./store');
const { randomBytes } = require('node:crypto');
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.STORE !== 'firestore' || !process.env.ASSET_BUCKET || !process.env.DEMO_CODE)) throw new Error('Production requires Firestore, ASSET_BUCKET, DEMO_CODE and SESSION_SECRET (32+ characters)');
const store = createStore(process.env.STORE || 'memory');
const app = createApp({ store, secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), demoCode: process.env.DEMO_CODE });
const server = app.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log(JSON.stringify({ severity: 'INFO', event: 'server_started', store: store.kind })));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
