-- Existing and new children opt in explicitly; arithmetic preferences are unchanged.
ALTER TABLE players ADD COLUMN reasoning_settings TEXT NOT NULL
  DEFAULT '{"schemaVersion":1,"enabledFamilies":[]}';
