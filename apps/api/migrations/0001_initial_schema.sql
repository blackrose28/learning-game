-- 0001_initial_schema.sql
-- Cloudflare D1 Migration for Math Archer
-- Tables: players, sessions, attempts, skill_progress

-- 1. Players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  arrows_allowed INTEGER NOT NULL DEFAULT 50,
  arrows_used INTEGER NOT NULL DEFAULT 0,
  hits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(player_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_player_date ON sessions(player_id, date);

-- 3. Attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  left INTEGER NOT NULL,
  right INTEGER NOT NULL,
  answer INTEGER NOT NULL,
  selected_answer INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  skill TEXT NOT NULL,
  hint_used INTEGER NOT NULL DEFAULT 0,
  hint_level TEXT,
  category TEXT,
  mode TEXT NOT NULL DEFAULT 'adventure',
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_attempts_player_timestamp ON attempts(player_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_player_skill ON attempts(player_id, skill);

-- 4. Skill Progress table
CREATE TABLE IF NOT EXISTS skill_progress (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0.0,
  recent_accuracy REAL NOT NULL DEFAULT 0.0,
  recent_results TEXT NOT NULL DEFAULT '[]',
  average_response_time_ms REAL NOT NULL DEFAULT 0.0,
  total_response_time_ms REAL NOT NULL DEFAULT 0.0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  hint_rate REAL NOT NULL DEFAULT 0.0,
  score REAL NOT NULL DEFAULT 0.0,
  mastery_level TEXT NOT NULL DEFAULT 'developing',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, skill)
);

