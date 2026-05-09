-- ============================================================================
-- DON'T THINK ABOUT IT — Database Schema
-- Leaderboards, ghost data, daily challenges
-- ============================================================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PLAYERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       TEXT UNIQUE,
  display_name   TEXT,
  avatar_url     TEXT,
  -- Lifetime stats
  total_games    INTEGER NOT NULL DEFAULT 0,
  best_time      NUMERIC(10,2) NOT NULL DEFAULT 0,  -- seconds
  best_room      INTEGER NOT NULL DEFAULT 0,
  total_deaths   INTEGER NOT NULL DEFAULT 0,
  deaths_looked  INTEGER NOT NULL DEFAULT 0,
  deaths_ignored INTEGER NOT NULL DEFAULT 0,
  deaths_insanity INTEGER NOT NULL DEFAULT 0,
  -- Settings
  use_gyroscope  BOOLEAN NOT NULL DEFAULT false,
  haptics_enabled BOOLEAN NOT NULL DEFAULT true,
  audio_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GAME RUNS (every play session)
-- ============================================================================
CREATE TABLE game_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Results
  time_alive      NUMERIC(10,2) NOT NULL,
  rooms_cleared   INTEGER NOT NULL DEFAULT 0,
  death_cause     TEXT NOT NULL CHECK (death_cause IN ('looked', 'ignored', 'insanity')),
  -- Peak stats during run
  peak_fear       INTEGER NOT NULL DEFAULT 0,
  lowest_sanity   INTEGER NOT NULL DEFAULT 0,
  peak_danger     INTEGER NOT NULL DEFAULT 0,
  entities_seen   INTEGER NOT NULL DEFAULT 0,
  -- Behavior
  investigations  INTEGER NOT NULL DEFAULT 0,
  avoidances      INTEGER NOT NULL DEFAULT 0,
  flashlights_used INTEGER NOT NULL DEFAULT 0,
  -- Device
  device_type     TEXT,  -- ios, android
  -- Timestamps
  played_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_profile ON game_runs(profile_id);
CREATE INDEX idx_runs_time ON game_runs(time_alive DESC);
CREATE INDEX idx_runs_rooms ON game_runs(rooms_cleared DESC);
CREATE INDEX idx_runs_played ON game_runs(played_at DESC);

-- ============================================================================
-- LEADERBOARDS (materialized for fast reads)
-- ============================================================================
CREATE TABLE leaderboard_alltime (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  username        TEXT,
  best_time       NUMERIC(10,2) NOT NULL,
  best_room       INTEGER NOT NULL,
  total_games     INTEGER NOT NULL DEFAULT 1,
  rank            INTEGER,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lb_alltime_time ON leaderboard_alltime(best_time DESC);
CREATE INDEX idx_lb_alltime_room ON leaderboard_alltime(best_room DESC);

-- Daily leaderboard (reset at midnight UTC)
CREATE TABLE leaderboard_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username        TEXT,
  best_time       NUMERIC(10,2) NOT NULL,
  best_room       INTEGER NOT NULL,
  day_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  played_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, day_date)
);

CREATE INDEX idx_lb_daily_date ON leaderboard_daily(day_date, best_time DESC);

-- ============================================================================
-- GHOST DATA (see where others died — like Dark Souls bloodstains)
-- ============================================================================
CREATE TABLE ghost_deaths (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Where they died (camera rotation at death)
  death_rotation  JSONB NOT NULL,  -- {x, y}
  death_room      INTEGER NOT NULL DEFAULT 0,
  death_cause     TEXT NOT NULL CHECK (death_cause IN ('looked', 'ignored', 'insanity')),
  time_alive      NUMERIC(10,2) NOT NULL,
  -- For rendering ghost marker
  entity_type     TEXT,  -- what killed them
  entity_position JSONB, -- {x, y, z}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ghost_room ON ghost_deaths(death_room);
CREATE INDEX idx_ghost_recent ON ghost_deaths(created_at DESC);

-- ============================================================================
-- DAILY CHALLENGES
-- ============================================================================
CREATE TABLE daily_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date  DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  -- Challenge modifiers
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  modifiers       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- e.g. {"spawn_rate": 2.0, "entity_types": ["eyes", "crawler"], "no_flashlight": true}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_challenge_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time_alive      NUMERIC(10,2) NOT NULL,
  rooms_cleared   INTEGER NOT NULL DEFAULT 0,
  death_cause     TEXT NOT NULL CHECK (death_cause IN ('looked', 'ignored', 'insanity')),
  played_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, profile_id)  -- one attempt per day
);

CREATE INDEX idx_dcr_challenge ON daily_challenge_runs(challenge_id, time_alive DESC);

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================
CREATE TABLE achievements (
  id              TEXT PRIMARY KEY,  -- 'survive_60s', 'room_10', etc.
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL,     -- emoji
  requirement     JSONB NOT NULL     -- {"type": "time", "value": 60}
);

CREATE TABLE player_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, achievement_id)
);

-- ============================================================================
-- SEED ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, requirement) VALUES
  ('survive_30', 'Still Here', 'Survive 30 seconds', '👁️', '{"type":"time","value":30}'),
  ('survive_60', 'Nerves of Steel', 'Survive 60 seconds', '🧠', '{"type":"time","value":60}'),
  ('survive_120', 'Unbreakable', 'Survive 2 minutes', '💀', '{"type":"time","value":120}'),
  ('survive_300', 'What Are You?', 'Survive 5 minutes', '👑', '{"type":"time","value":300}'),
  ('room_5', 'Explorer', 'Clear 5 rooms', '🚪', '{"type":"rooms","value":5}'),
  ('room_10', 'Deep Diver', 'Clear 10 rooms', '🕳️', '{"type":"rooms","value":10}'),
  ('room_20', 'Abyss Walker', 'Clear 20 rooms', '⛓️', '{"type":"rooms","value":20}'),
  ('death_looked', 'Curiosity', 'Die by looking too long', '👀', '{"type":"death","value":"looked"}'),
  ('death_ignored', 'Denial', 'Die by ignoring a threat', '🙈', '{"type":"death","value":"ignored"}'),
  ('death_insanity', 'Broken', 'Die from insanity', '🌀', '{"type":"death","value":"insanity"}'),
  ('all_deaths', 'Full Circle', 'Die all three ways', '🔄', '{"type":"all_deaths","value":3}'),
  ('no_flashlight', 'Pure Dark', 'Clear 5 rooms without flashlight', '🌑', '{"type":"no_flashlight","value":5}'),
  ('games_10', 'Addicted', 'Play 10 games', '🎮', '{"type":"games","value":10}'),
  ('games_50', 'Obsessed', 'Play 50 games', '😵', '{"type":"games","value":50}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_alltime ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_deaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Game runs
DROP POLICY IF EXISTS "runs_select" ON game_runs;
CREATE POLICY "runs_select" ON game_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "runs_insert" ON game_runs;
CREATE POLICY "runs_insert" ON game_runs FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- Leaderboards (public read)
DROP POLICY IF EXISTS "lb_alltime_select" ON leaderboard_alltime;
CREATE POLICY "lb_alltime_select" ON leaderboard_alltime FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lb_daily_select" ON leaderboard_daily;
CREATE POLICY "lb_daily_select" ON leaderboard_daily FOR SELECT TO authenticated USING (true);

-- Ghost deaths (public read, own write)
DROP POLICY IF EXISTS "ghost_select" ON ghost_deaths;
CREATE POLICY "ghost_select" ON ghost_deaths FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ghost_insert" ON ghost_deaths;
CREATE POLICY "ghost_insert" ON ghost_deaths FOR INSERT TO authenticated WITH CHECK (true);

-- Daily challenges (public read)
DROP POLICY IF EXISTS "dc_select" ON daily_challenges;
CREATE POLICY "dc_select" ON daily_challenges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "dcr_select" ON daily_challenge_runs;
CREATE POLICY "dcr_select" ON daily_challenge_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "dcr_insert" ON daily_challenge_runs;
CREATE POLICY "dcr_insert" ON daily_challenge_runs FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- Achievements (public read)
DROP POLICY IF EXISTS "ach_select" ON achievements;
CREATE POLICY "ach_select" ON achievements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pach_select" ON player_achievements;
CREATE POLICY "pach_select" ON player_achievements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pach_insert" ON player_achievements;
CREATE POLICY "pach_insert" ON player_achievements FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- Allow anonymous read on leaderboards (for non-logged-in players)
DROP POLICY IF EXISTS "lb_alltime_anon" ON leaderboard_alltime;
CREATE POLICY "lb_alltime_anon" ON leaderboard_alltime FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "ghost_anon" ON ghost_deaths;
CREATE POLICY "ghost_anon" ON ghost_deaths FOR SELECT TO anon USING (true);

-- ============================================================================
-- AUTO-UPDATE LEADERBOARD FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_leaderboard_on_run()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile stats
  UPDATE profiles SET
    total_games = total_games + 1,
    best_time = GREATEST(best_time, NEW.time_alive),
    best_room = GREATEST(best_room, NEW.rooms_cleared),
    total_deaths = total_deaths + 1,
    deaths_looked = deaths_looked + CASE WHEN NEW.death_cause = 'looked' THEN 1 ELSE 0 END,
    deaths_ignored = deaths_ignored + CASE WHEN NEW.death_cause = 'ignored' THEN 1 ELSE 0 END,
    deaths_insanity = deaths_insanity + CASE WHEN NEW.death_cause = 'insanity' THEN 1 ELSE 0 END
  WHERE id = NEW.profile_id;

  -- Upsert all-time leaderboard
  INSERT INTO leaderboard_alltime (profile_id, username, best_time, best_room, total_games)
  VALUES (
    NEW.profile_id,
    (SELECT username FROM profiles WHERE id = NEW.profile_id),
    NEW.time_alive,
    NEW.rooms_cleared,
    1
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    best_time = GREATEST(leaderboard_alltime.best_time, NEW.time_alive),
    best_room = GREATEST(leaderboard_alltime.best_room, NEW.rooms_cleared),
    total_games = leaderboard_alltime.total_games + 1,
    updated_at = now();

  -- Upsert daily leaderboard
  INSERT INTO leaderboard_daily (profile_id, username, best_time, best_room, day_date)
  VALUES (
    NEW.profile_id,
    (SELECT username FROM profiles WHERE id = NEW.profile_id),
    NEW.time_alive,
    NEW.rooms_cleared,
    CURRENT_DATE
  )
  ON CONFLICT (profile_id, day_date) DO UPDATE SET
    best_time = GREATEST(leaderboard_daily.best_time, NEW.time_alive),
    best_room = GREATEST(leaderboard_daily.best_room, NEW.rooms_cleared);

  -- Ghost death record
  INSERT INTO ghost_deaths (profile_id, death_rotation, death_room, death_cause, time_alive)
  VALUES (NEW.profile_id, '{"x":0,"y":0}'::jsonb, NEW.rooms_cleared, NEW.death_cause, NEW.time_alive);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS run_leaderboard_trigger ON game_runs;
CREATE TRIGGER run_leaderboard_trigger
  AFTER INSERT ON game_runs
  FOR EACH ROW
  WHEN (NEW.profile_id IS NOT NULL)
  EXECUTE FUNCTION update_leaderboard_on_run();
