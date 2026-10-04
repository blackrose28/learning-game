ALTER TABLE players ADD COLUMN animation_speed TEXT NOT NULL DEFAULT 'fast' CHECK (animation_speed IN ('fast', 'normal', 'slow'));
