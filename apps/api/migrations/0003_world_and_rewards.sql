-- 0003_world_and_rewards.sql
-- Cloudflare D1 Migration for Math Archer: World Progression & Player Rewards Sync

-- 1. Player World Progression table
CREATE TABLE IF NOT EXISTS player_world_progression (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  active_area_id TEXT NOT NULL DEFAULT 'castle',
  completed_sessions_count INTEGER NOT NULL DEFAULT 0,
  unlocked_area_ids TEXT NOT NULL DEFAULT '["castle"]',
  updated_at TEXT NOT NULL
);

-- 2. Player Rewards table
CREATE TABLE IF NOT EXISTS player_rewards (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  unlocked_cosmetic_ids TEXT NOT NULL DEFAULT '["outfit_apprentice","bow_wooden","arrow_classic","banner_royal","statue_archer","ground_cobblestone"]',
  equipped_cosmetics TEXT NOT NULL DEFAULT '{"outfit":"outfit_apprentice","bow":"bow_wooden","arrowEffect":"arrow_classic","castleBanner":"banner_royal","castleStatue":"statue_archer","castleGround":"ground_cobblestone"}',
  unlocked_achievement_ids TEXT NOT NULL DEFAULT '[]',
  achievement_progress TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

