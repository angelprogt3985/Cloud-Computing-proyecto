-- Glacier Quest — schema for the single shared room.
-- Run this once against your database (local Postgres for dev,
-- Cloud SQL for the real deployment) to create all tables.

CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(32) NOT NULL UNIQUE,
  level         INTEGER NOT NULL DEFAULT 1,
  hp            INTEGER NOT NULL DEFAULT 20,
  coins         INTEGER NOT NULL DEFAULT 0,
  x             INTEGER NOT NULL DEFAULT 400,
  y             INTEGER NOT NULL DEFAULT 300,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  body        VARCHAR(140) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id          SERIAL PRIMARY KEY,
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_type   VARCHAR(32) NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A single NPC row is enough for the "Old Sage" — no need for a table
-- per NPC instance at this scope. Dialogue text itself is generated
-- on demand via services/gemini.js, not stored here.
CREATE TABLE IF NOT EXISTS npc_state (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(32) NOT NULL,
  x           INTEGER NOT NULL,
  y           INTEGER NOT NULL
);

INSERT INTO npc_state (name, x, y)
SELECT 'Old sage', 520, 160
WHERE NOT EXISTS (SELECT 1 FROM npc_state);

-- Keep the chat log from growing forever during dev/demo — the client
-- only ever displays the most recent messages anyway.
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at DESC);