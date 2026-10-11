const { createApp } = require('./app');
const { createStore } = require('./store');
const { randomBytes } = require('node:crypto');
const { validateConfig } = require('./config');
validateConfig(process.env);
const store = createStore(process.env.STORE || 'memory');
const app = createApp({ store, secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), demoCode: process.env.DEMO_CODE });
const server = app.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log(JSON.stringify({ severity: 'INFO', event: 'server_started', store: store.kind })));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
