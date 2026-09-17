-- 0002_auth_and_profiles.sql
-- Cloudflare D1 Migration for Math Archer: Phase 7 Authentication and Profiles
-- Tables: parents, and alterations for players (children)

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_pin TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);

-- Add parent_id, pin, avatar, and grade to players table
ALTER TABLE players ADD COLUMN parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE;
ALTER TABLE players ADD COLUMN pin TEXT;
ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT 'archer-1';
ALTER TABLE players ADD COLUMN grade TEXT DEFAULT '1st Grade';

CREATE INDEX IF NOT EXISTS idx_players_parent_id ON players(parent_id);

-- Seed default demo parent (password: 'parent123', pin: '1234')
INSERT OR IGNORE INTO parents (id, email, password_hash, salt, name, parent_pin, created_at, updated_at)
VALUES (
  'parent_default',
  'parent@math-archer.local',
  '2aa80c0caff7a87bb10730612e78ce1f4c159a9f27ba7fa39ffd737ce43ad175',
  'seededsalt123',
  'Demo Parent',
  '1234',
  '2026-09-17T00:00:00.000Z',
  '2026-09-17T00:00:00.000Z'
);

-- Seed demo child 'player-local' linked to parent_default (PIN '1234')
INSERT INTO players (id, name, parent_id, pin, avatar, grade, created_at, updated_at)
VALUES (
  'player-local',
  'Alex',
  'parent_default',
  '1234',
  'archer-1',
  '1st Grade',
  '2026-09-17T00:00:00.000Z',
  '2026-09-17T00:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  parent_id = 'parent_default',
  pin = '1234',
  avatar = 'archer-1',
  grade = '1st Grade';

-- Seed second demo child 'child_mia' linked to parent_default (PIN '5678')
INSERT OR IGNORE INTO players (id, name, parent_id, pin, avatar, grade, created_at, updated_at)
VALUES (
  'child_mia',
  'Mia',
  'parent_default',
  '5678',
  'archer-2',
  '1st Grade',
  '2026-09-17T00:00:00.000Z',
  '2026-09-17T00:00:00.000Z'
);

