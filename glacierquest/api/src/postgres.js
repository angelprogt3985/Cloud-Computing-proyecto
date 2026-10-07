const { Pool } = require('pg');
const { fail } = require('./game');
class PostgresStore {
  constructor(pool) {
    this.kind = 'postgres';
    this.pool = pool || new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'glacierquest',
      user: process.env.DB_USER || 'glacierquest',
      password: process.env.DB_PASSWORD,
      max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
      statement_timeout: 5000
    });
    this.pool.on?.('error', () => console.error(JSON.stringify({ severity: 'ERROR', event: 'postgres_pool_error' })));
  }
  async create(p) { await this.pool.query('INSERT INTO gq_players(id, data) VALUES ($1, $2::jsonb)', [p.id, JSON.stringify(p)]); }
  async get(id) { return (await this.pool.query('SELECT data FROM gq_players WHERE id = $1', [id])).rows[0]?.data; }
  async mutate(id, fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT data FROM gq_players WHERE id = $1 FOR UPDATE', [id]);
      if (!result.rows.length) fail(401, 'Sesión expirada; vuelve a entrar');
      const next = fn(result.rows[0].data);
      await client.query('UPDATE gq_players SET data = $2::jsonb WHERE id = $1', [id, JSON.stringify(next)]);
      await client.query('COMMIT'); return next;
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  async heartbeat(p, pos) {
    await this.pool.query('INSERT INTO gq_presence(id, name, x, y, seen_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,x=EXCLUDED.x,y=EXCLUDED.y,seen_at=now()', [p.id,p.name,pos.x,pos.y]);
  }
  async room() {
    const [people, chat] = await Promise.all([
      this.pool.query("SELECT id,name,x,y FROM gq_presence WHERE seen_at > now() - interval '30 seconds' ORDER BY seen_at DESC LIMIT 40"),
      this.pool.query('SELECT data FROM gq_chat ORDER BY created_at DESC, id DESC LIMIT 30')
    ]);
    return { players: people.rows, messages: chat.rows.reverse().map(r => r.data) };
  }
  async chat(p, body) {
    const m = { id: require('node:crypto').randomUUID(), player_name: p.name, body, createdAt: Date.now() };
    await this.pool.query('INSERT INTO gq_chat(id,data) VALUES ($1,$2::jsonb)', [m.id,JSON.stringify(m)]); return m;
  }
  async health() { await this.pool.query('SELECT id FROM gq_players LIMIT 1'); return true; }
  async close() { await this.pool.end(); }
}
module.exports = { PostgresStore };
