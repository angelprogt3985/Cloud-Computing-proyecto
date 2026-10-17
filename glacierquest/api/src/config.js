function validateConfig(env) {
  const cloud = Boolean(env.K_SERVICE);
  if (env.NODE_ENV !== 'production' && !cloud) return;
  const memoryDemo = env.GQ_DEMO_MODE === 'true' && env.STORE === 'memory';
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.ASSET_BUCKET || !env.DEMO_CODE) {
    throw new Error('Hosted app requires ASSET_BUCKET, DEMO_CODE and SESSION_SECRET (32+ characters)');
  }
  if (!memoryDemo && !['postgres', 'firestore', 'realtime'].includes(env.STORE)) {
    throw new Error('A persistent STORE is required unless GQ_DEMO_MODE=true explicitly enables memory');
  }
  if (env.STORE === 'postgres' && (!env.DB_HOST || !env.DB_PASSWORD)) throw new Error('PostgreSQL requires credentials');
  if (env.STORE === 'realtime' && !env.FIREBASE_DATABASE_URL) throw new Error('Realtime Database requires FIREBASE_DATABASE_URL');
  if (env.FIRESTORE_EMULATOR_HOST) throw new Error('The emulator is local-only');
  if (env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Authentication emulator is local-only');
}
module.exports = { validateConfig };
