const express = require('express');
const path = require('node:path');
const { createHmac, timingSafeEqual, randomUUID } = require('node:crypto');
const { NPC, ITEMS, fail, coordinates, newPlayer, startBattle, battleTurn, collect } = require('./game');
const expedition = require('./expedition');
const arena = require('./arena');
function createApp({ store, secret, demoCode, logger = console.log, maintenanceAuth = require('./maintenance').authorizeMaintenance, accountAuth = require('./accounts').accountAuth }) {
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
  app.get('/health', async (req, res) => { try { await store.health(); res.json({ status: 'ok', database: store.kind, cloud: !!process.env.K_SERVICE, demo: process.env.GQ_DEMO_MODE === 'true', ephemeral: store.kind === 'memory', accounts:!!process.env.FIREBASE_WEB_API_KEY }); } catch { res.status(503).json({ status: 'degraded', database: store.kind }); } });
  app.post('/internal/cleanup', async (req, res) => {
    if (!await maintenanceAuth(req)) return res.status(403).json({ error: 'Acceso restringido' });
    if (!store.cleanup) return res.status(503).json({ error: 'Limpieza no disponible' });
    const removed = await store.cleanup();
    logger(JSON.stringify({ severity: 'INFO', event: 'scheduled_cleanup', removed }));
    res.json({ status: 'ok', removed });
  });
  app.post('/api/join', async (req, res) => {
    if (demoCode && req.body.code !== demoCode) fail(403, 'Código de clase incorrecto');
    const player = expedition.normalize(newPlayer(req.body.name)); await store.create(player); await store.heartbeat(player, player);
    res.status(201).json({ player, token: token(player.id) });
  });
  const authAttempts=new Map();
  app.post('/api/account', async (req,res)=>{
    const key=req.socket.remoteAddress,now=Date.now();
    for(const [key,v] of authAttempts) if(v.until<now) authAttempts.delete(key);
    const tries=authAttempts.get(key)||{n:0,until:now+60000};authAttempts.set(key,tries);
    if(++tries.n>12) fail(429,'Demasiados intentos; espera un minuto');
    if(demoCode && req.body.code!==demoCode) fail(403,'Código de clase incorrecto');
    const identity=await accountAuth(req.body);
    if(identity.reset) return res.json({message:'Si la cuenta existe, recibirás un correo para restablecer tu contraseña.'});
    const id=`account_${identity.uid}`;
    let player=await store.get(id);
    if(!player) {
      let initial=expedition.normalize(newPlayer(req.body.name || 'Explorador'));
      // A valid existing guest session may link its progress once, never by name.
      if(req.headers.authorization) {
        let authError;auth(req,res,e=>{authError=e;});
        if(authError) throw authError;
        const old=await store.get(req.playerId);
        if(old && !old.account) {
          initial=await store.mutate(old.id,p=>{
            if(p.linkedAccount && p.linkedAccount!==id) fail(409,'Este personaje ya fue vinculado a otra cuenta');
            p.linkedAccount=id;return p;
          });
        }
      }
      initial.id=id;initial.account=true;delete initial.linkedAccount;
      if(!store.createIfAbsent) fail(503,'Este adaptador no permite cuentas persistentes');
      player=await store.createIfAbsent(initial);
    }
    expedition.normalize(player);await store.heartbeat(player,player);
    res.json({player,token:token(player.id)});
  });
  app.use('/api', auth);
  async function settleArena() {
    if(!store.arenaGet) return null;
    let a=await store.arenaGet();
    if(a && ['pending','active'].includes(a.status) && Date.now()>a.expiresAt) a=await store.arenaMutate(v=>arena.expired(v));
    if(a?.status==='finished' && !a.settled) {
      for(const fighter of a.fighters) await store.mutate(fighter.id,p=>{
        expedition.normalize(p);
        p.duelRewards ||= {};
        if(!p.duelRewards[a.id]) { p.duelRewards[a.id]=true;const won=a.winner===p.id;expedition.gain(p,won?60:15);if(won){p.coins+=10;p.pvpWins++;} }
        return p;
      });
      a=await store.arenaMutate(v=>{if(v?.id===a.id)v.settled=true;return v;});
    }
    return a;
  }
  const publicPlayer=p=>{expedition.normalize(p);if(p){delete p.duelRewards;delete p.linkedAccount;}return p;};
  app.get('/api/me', async (req, res) => { const player = await store.get(req.playerId); if (!player) fail(401, 'Sesión no disponible'); res.json({ player:publicPlayer(player),quests:expedition.quests(player) }); });
  app.post('/api/sync', async (req, res) => {
    const pos = coordinates(req.body.x, req.body.y);
    const duel=await settleArena();
    const p = publicPlayer(await store.get(req.playerId)); if (!p) fail(401, 'Sesión no disponible');
    await store.heartbeat(p, pos); res.json({ ...(await store.room()), player:p,quests:expedition.quests(p), npc: NPC, items: ITEMS,world:expedition.WORLD,places:expedition.PLACES,arena:duel,serverTime:Date.now() });
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
  app.post('/api/explore',async(req,res)=>{
    const pos=coordinates(req.body.x,req.body.y);
    const player=await store.mutate(req.playerId,p=>expedition.act(Object.assign(p,pos),req.body.action,req.body.place));
    res.json({player,quests:expedition.quests(player),serverTime:Date.now()});
  });
  app.post('/api/arena/challenge',async(req,res)=>{
    if(!store.arenaMutate) fail(503,'Arena no disponible');
    await settleArena();
    const room=await store.room();
    const other=room.players.find(p=>p.id===req.body.targetId);
    if(!other) fail(409,'Ese explorador ya no está conectado');
    const me=await store.get(req.playerId),target=await store.get(other.id);
    if(!me||!target) fail(409,'Jugador no disponible');
    if(me.battle?.status==='active'||target.battle?.status==='active') fail(409,'Terminen el combate con el guardián primero');
    const next=await store.arenaMutate(a=>arena.challenge(a,me,target));res.json({arena:next});
  });
  app.post('/api/arena/respond',async(req,res)=>{if(typeof req.body.accept!=='boolean')fail(400,'Respuesta inválida');res.json({arena:await store.arenaMutate(a=>arena.respond(a,req.playerId,req.body.id,req.body.accept))});});
  app.post('/api/arena/turn',async(req,res)=>{
    await store.arenaMutate(a=>arena.turn(a,req.playerId,req.body.id,req.body.turn,req.body.action));
    res.json({arena:await settleArena(),player:publicPlayer(await store.get(req.playerId))});
  });
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
    try { await store.health(); database = store.kind === 'firestore' ? (process.env.FIRESTORE_EMULATOR_HOST ? 'emulador local; no nube' : 'Firestore conectado; fuera del conteo académico') : store.kind === 'postgres' ? (process.env.K_SERVICE ? 'PostgreSQL conectado; verificar instancia Cloud SQL en consola' : 'PostgreSQL local conectado') : process.env.K_SERVICE ? 'memoria temporal en Cloud Run; se pierde al reiniciar; no cuenta como base de datos' : 'memoria local, no nube'; } catch {}
    try { assetCache = await loadAsset(); asset = assetCache.source; } catch {}
    if (store.kind === 'realtime' && database !== 'error') database = 'Firebase Realtime Database conectado; fuera del conteo académico';
    res.json({ checkedAt: new Date().toISOString(), services: [
      { name: 'Cloud Run', status: process.env.K_SERVICE ? 'ejecutándose en Cloud Run' : 'servidor local' },
      { name: store.kind === 'realtime' ? 'Firebase Realtime Database (no cuenta)' : store.kind === 'firestore' ? 'Firestore (no cuenta)' : store.kind === 'postgres' ? 'PostgreSQL' : 'Datos de práctica', status: database }, { name: 'Cloud Storage', status: asset },
      { name: 'IAM', status: 'verificar roles y cuenta de servicio en consola' },
      { name: 'Secret Manager', status: process.env.K_SERVICE ? 'verificar referencia de secretos en revisión' : process.env.GQ_SECRET_SOURCE === 'gcloud-secret-manager' ? 'secretos cargados por el iniciador desde GCP; verificar versiones y permisos en consola' : 'clave local; sin evidencia de Secret Manager' },
      { name: 'Observability', status: 'logs JSON implementados; verificar recepción y panel en consola' },
      { name: 'Cloud Build', status: 'verificar construcción e imagen en historial de Cloud Build' },
      { name: 'GitHub Actions (apoyo)', status: 'verificar validación del código en GitHub' },
      { name: 'Artifact Registry (apoyo)', status: 'verificar imagen y digest en consola' },
      { name: 'Cloud Scheduler', status: store.cleanup && process.env.CLEANUP_SERVICE_ACCOUNT ? 'endpoint de limpieza protegido configurado; verificar ejecución del job en consola' : 'planificado: limpieza periódica; todavía no integrado' }
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
