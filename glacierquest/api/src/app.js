const express = require('express');
const path = require('node:path');
const { createHmac, timingSafeEqual, randomUUID } = require('node:crypto');
const { NPC, ITEMS, fail, coordinates, newPlayer, startBattle, battleTurn, collect } = require('./game');
function createApp({ store, secret, demoCode, logger = console.log }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4kb' }));
  app.use((req, res, next) => {
    req.requestId = randomUUID(); res.set('X-Request-Id', req.requestId);
    res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', "default-src 'self'; style-src 'self'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'");
    const start = Date.now();
    res.on('finish', () => { if (req.path.startsWith('/api') || req.path === '/health') logger(JSON.stringify({ severity: res.statusCode >= 500 ? 'ERROR' : 'INFO', event: 'request', requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start })); });
    next();
  });
  const sign = payload => createHmac('sha256', secret).update(payload).digest('base64url');
  const token = id => { const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + 7 * 86400000 })).toString('base64url'); return `${payload}.${sign(payload)}`; };
  function auth(req, res, next) {
    try {
      const [payload, sig, extra] = (req.headers.authorization || '').replace(/^Bearer /, '').split('.');
      if (!payload || !sig || extra) fail(401, 'Vuelve a entrar a la plaza');
      const expected = Buffer.from(sign(payload)); const actual = Buffer.from(sig);
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) fail(401, 'Sesión inválida');
      const data = JSON.parse(Buffer.from(payload, 'base64url'));
      if (!data.id || !Number.isFinite(data.exp) || data.exp < Date.now()) fail(401, 'Sesión expirada');
      req.playerId = data.id; next();
    } catch { next(Object.assign(new Error('Sesión inválida o expirada'), { status: 401 })); }
  }
  // Per-instance only. Not a billing cap or distributed abuse protection.
  const windows = new Map();
  app.use('/api', (req, res, next) => {
    const now = Date.now(); const key = req.headers.authorization || req.socket.remoteAddress;
    if (windows.size > 5000) for (const [k,v] of windows) if (v.until < now) windows.delete(k);
    let w = windows.get(key); if (!w || w.until < now) { w = { n: 0, until: now + 60000 }; windows.set(key, w); }
    if (++w.n > 100) return res.status(429).json({ error: 'Demasiadas solicitudes; espera un minuto' });
    next();
  });
  app.get('/health', async (req, res) => { try { await store.health(); res.json({ status: 'ok', database: store.kind, cloud: !!process.env.K_SERVICE }); } catch { res.status(503).json({ status: 'degraded', database: store.kind }); } });
  app.post('/api/join', async (req, res) => {
    if (demoCode && req.body.code !== demoCode) fail(403, 'Código de clase incorrecto');
    const player = newPlayer(req.body.name); await store.create(player); await store.heartbeat(player, player);
    res.status(201).json({ player, token: token(player.id) });
  });
  app.use('/api', auth);
  app.get('/api/me', async (req, res) => { const player = await store.get(req.playerId); if (!player) fail(401, 'Sesión no disponible'); res.json({ player }); });
  app.post('/api/sync', async (req, res) => {
    const pos = coordinates(req.body.x, req.body.y);
    const p = await store.get(req.playerId); if (!p) fail(401, 'Sesión no disponible');
    await store.heartbeat(p, pos); res.json({ ...(await store.room()), npc: NPC, items: ITEMS });
  });
  app.post('/api/chat', async (req, res) => {
    const body = req.body.body;
    if (typeof body !== 'string' || !body.trim() || body.trim().length > 140) fail(400, 'Mensaje de 1 a 140 caracteres');
    const p = await store.mutate(req.playerId, p => { if (Date.now() - (p.lastChatAt || 0) < 1500) fail(429, 'Espera antes de enviar otro mensaje'); p.lastChatAt = Date.now(); return p; });
    res.status(201).json({ message: await store.chat(p, body.trim()) });
  });
  app.post('/api/collect', async (req, res) => {
    const pos = coordinates(req.body.x, req.body.y);
    const player = await store.mutate(req.playerId, p => { if (p.battle?.status === 'active') fail(409, 'Termina el duelo antes de recoger objetos'); return collect(Object.assign(p, pos), req.body.itemId); }); res.json({ player });
  });
  app.post('/api/battle/start', async (req, res) => { const pos = coordinates(req.body.x, req.body.y); res.json({ player: await store.mutate(req.playerId, p => startBattle(Object.assign(p, pos))) }); });
  app.post('/api/battle/turn', async (req, res) => res.json({ player: await store.mutate(req.playerId, p => battleTurn(p, req.body.action, req.body.battleId, req.body.turn)) }));
  let assetCache;
  async function loadAsset() {
    if (process.env.ASSET_BUCKET) {
      const { Storage } = require('@google-cloud/storage');
      const [data] = await new Storage().bucket(process.env.ASSET_BUCKET).file('glacier-banner.svg').download();
      return { data, source: 'Google Cloud Storage', at: Date.now() };
    }
    return { data: require('node:fs').readFileSync(path.join(__dirname, '../../assets/glacier-banner.svg')), source: 'archivo local', at: Date.now() };
  }
  app.get('/api/services', async (req, res) => {
    let database = 'error'; let asset = 'error';
    try { await store.health(); database = store.kind === 'postgres' ? (process.env.K_SERVICE ? 'PostgreSQL conectado; verificar instancia Cloud SQL en consola' : 'PostgreSQL local conectado') : 'memoria local, no nube'; } catch {}
    try { assetCache = await loadAsset(); asset = assetCache.source; } catch {}
    res.json({ checkedAt: new Date().toISOString(), services: [
      { name: 'Cloud Run', status: process.env.K_SERVICE ? 'ejecutándose en Cloud Run' : 'servidor local' },
      { name: 'Cloud SQL PostgreSQL', status: database }, { name: 'Cloud Storage', status: asset },
      { name: 'IAM', status: 'verificar roles y cuenta de servicio en consola' },
      { name: 'Secret Manager', status: process.env.K_SERVICE ? 'verificar referencia de secretos en revisión' : 'clave efímera local' },
      { name: 'Observability', status: 'logs JSON implementados; verificar recepción y panel en consola' },
      { name: 'GitHub Actions', status: 'verificar ejecución de despliegue en GitHub' },
      { name: 'Artifact Registry', status: 'verificar imagen y digest en consola' }
    ] });
  });
  app.get('/api/asset', async (req, res) => {
    if (!assetCache || Date.now() - assetCache.at > 300000) assetCache = await loadAsset();
    res.set('Content-Type', 'image/svg+xml').set('Cache-Control', 'private, max-age=300').set('X-Asset-Source', assetCache.source).send(assetCache.data);
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta desconocida' }));
  app.use(express.static(path.join(__dirname, '../../client'), { etag: true, maxAge: 0 }));
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) logger(JSON.stringify({ severity: 'ERROR', event: 'request_failed', requestId: req.requestId, code: String(err.code || 'internal') }));
    res.status(status).json({ error: status >= 500 ? 'Servicio no disponible; reintenta' : err.message, requestId: req.requestId });
  });
  return app;
}
module.exports = { createApp };
