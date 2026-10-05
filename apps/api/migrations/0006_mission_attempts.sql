-- Reasoning evidence is separate from arithmetic attempts, sessions, and mastery.
CREATE TABLE mission_attempts (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, id)
);

CREATE INDEX idx_mission_attempts_player_started
  ON mission_attempts(player_id, started_at, id);
