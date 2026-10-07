-- Apply once with the database administrator. Runtime only needs DML grants.
BEGIN;
CREATE TABLE IF NOT EXISTS gq_players (
  id uuid PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object')
);
CREATE TABLE IF NOT EXISTS gq_presence (
  id uuid PRIMARY KEY REFERENCES gq_players(id) ON DELETE CASCADE,
  name varchar(24) NOT NULL,
  x integer NOT NULL CHECK (x BETWEEN 16 AND 624),
  y integer NOT NULL CHECK (y BETWEEN 16 AND 384),
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gq_presence_seen_at ON gq_presence(seen_at DESC);
CREATE TABLE IF NOT EXISTS gq_chat (
  id uuid PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gq_chat_created_at ON gq_chat(created_at DESC, id DESC);
COMMIT;
