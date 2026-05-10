-- ============================================================================
-- DARKNESS PASS + XP SYSTEM
-- Seasonal progression with free/premium tracks
-- ============================================================================

-- XP field on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- DARKNESS PASS SEASONS
-- ============================================================================
CREATE TABLE darkness_pass_seasons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number   INTEGER NOT NULL UNIQUE,
  season_name     TEXT NOT NULL,
  theme           TEXT NOT NULL DEFAULT 'default',
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'active', 'ended')),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  premium_price_cents INTEGER NOT NULL DEFAULT 499,
  total_tiers     INTEGER NOT NULL DEFAULT 30,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PASS TIERS (rewards at each level)
-- ============================================================================
CREATE TABLE darkness_pass_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       UUID NOT NULL REFERENCES darkness_pass_seasons(id) ON DELETE CASCADE,
  tier_number     INTEGER NOT NULL,
  track           TEXT NOT NULL CHECK (track IN ('free', 'premium')),
  reward_type     TEXT NOT NULL CHECK (reward_type IN (
    'flashlight_skin', 'room_theme', 'entity_skin', 'death_animation',
    'ghost_marker', 'title', 'flashlight_charge', 'coins',
    'second_chance', 'xp_boost', 'entity_unlock'
  )),
  reward_name     TEXT NOT NULL,
  reward_icon     TEXT NOT NULL,
  reward_data     JSONB DEFAULT '{}'::jsonb,
  xp_required     INTEGER NOT NULL,
  UNIQUE(season_id, tier_number, track)
);

-- ============================================================================
-- PLAYER PASS PROGRESS
-- ============================================================================
CREATE TABLE darkness_pass_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id       UUID NOT NULL REFERENCES darkness_pass_seasons(id) ON DELETE CASCADE,
  is_premium      BOOLEAN NOT NULL DEFAULT false,
  current_xp      INTEGER NOT NULL DEFAULT 0,
  current_tier    INTEGER NOT NULL DEFAULT 0,
  claimed_free    INTEGER[] DEFAULT '{}',
  claimed_premium INTEGER[] DEFAULT '{}',
  purchased_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, season_id)
);

-- ============================================================================
-- COSMETIC INVENTORY
-- ============================================================================
CREATE TABLE cosmetic_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN (
    'flashlight_skin', 'room_theme', 'entity_skin',
    'death_animation', 'ghost_marker', 'title'
  )),
  rarity          TEXT NOT NULL DEFAULT 'common'
                    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  preview_data    JSONB DEFAULT '{}'::jsonb,
  price_coins     INTEGER NOT NULL DEFAULT 0,
  is_purchasable  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  acquired_via    TEXT NOT NULL CHECK (acquired_via IN ('pass', 'purchase', 'achievement', 'gift')),
  acquired_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, item_id)
);

-- Equipped cosmetics
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_flashlight UUID REFERENCES cosmetic_items(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_room_theme UUID REFERENCES cosmetic_items(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_ghost_marker UUID REFERENCES cosmetic_items(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_title TEXT;

-- ============================================================================
-- XP AWARD ON GAME RUN (extends existing trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION award_run_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_xp INTEGER := 5; -- base XP for playing
  v_season_id UUID;
BEGIN
  IF NEW.profile_id IS NULL THEN RETURN NEW; END IF;

  -- Time-based XP
  IF NEW.time_alive >= 10 THEN v_xp := v_xp + 10; END IF;
  IF NEW.time_alive >= 30 THEN v_xp := v_xp + 25; END IF;
  IF NEW.time_alive >= 60 THEN v_xp := v_xp + 50; END IF;
  IF NEW.time_alive >= 120 THEN v_xp := v_xp + 75; END IF;
  IF NEW.time_alive >= 300 THEN v_xp := v_xp + 150; END IF;

  -- Room-based XP
  v_xp := v_xp + (NEW.rooms_cleared * 30);

  -- Flashlight discipline bonus
  IF NEW.flashlights_used = 0 AND NEW.rooms_cleared >= 3 THEN
    v_xp := v_xp + 50;
  END IF;

  -- Update profile XP
  UPDATE profiles SET
    total_xp = total_xp + v_xp,
    current_level = GREATEST(1, (total_xp + v_xp) / 200 + 1)
  WHERE id = NEW.profile_id;

  -- Update darkness pass progress
  SELECT id INTO v_season_id FROM darkness_pass_seasons WHERE status = 'active' LIMIT 1;
  IF v_season_id IS NOT NULL THEN
    INSERT INTO darkness_pass_progress (profile_id, season_id, current_xp)
    VALUES (NEW.profile_id, v_season_id, v_xp)
    ON CONFLICT (profile_id, season_id) DO UPDATE SET
      current_xp = darkness_pass_progress.current_xp + v_xp,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS run_xp_trigger ON game_runs;
CREATE TRIGGER run_xp_trigger
  AFTER INSERT ON game_runs
  FOR EACH ROW
  EXECUTE FUNCTION award_run_xp();

-- ============================================================================
-- SEED SEASON 1
-- ============================================================================
INSERT INTO darkness_pass_seasons (season_number, season_name, theme, status, starts_at, ends_at)
VALUES (1, 'Season 1: The Awakening', 'awakening', 'active', now(), now() + interval '90 days')
ON CONFLICT (season_number) DO NOTHING;

-- Seed Season 1 tiers
DO $$
DECLARE
  v_season_id UUID;
BEGIN
  SELECT id INTO v_season_id FROM darkness_pass_seasons WHERE season_number = 1;
  IF v_season_id IS NULL THEN RETURN; END IF;

  -- Free track
  INSERT INTO darkness_pass_tiers (season_id, tier_number, track, reward_type, reward_name, reward_icon, xp_required) VALUES
    (v_season_id, 1, 'free', 'coins', '50 Coins', '🪙', 50),
    (v_season_id, 3, 'free', 'flashlight_charge', '+1 Flashlight', '🔦', 150),
    (v_season_id, 5, 'free', 'ghost_marker', 'Red Skull Marker', '💀', 300),
    (v_season_id, 8, 'free', 'coins', '100 Coins', '🪙', 500),
    (v_season_id, 10, 'free', 'title', 'Survivor', '🏷️', 700),
    (v_season_id, 13, 'free', 'flashlight_charge', '+1 Flashlight', '🔦', 950),
    (v_season_id, 15, 'free', 'entity_unlock', 'The Mirror', '🪞', 1200),
    (v_season_id, 18, 'free', 'coins', '150 Coins', '🪙', 1500),
    (v_season_id, 20, 'free', 'death_animation', 'Shatter', '💥', 1800),
    (v_season_id, 25, 'free', 'title', 'Fearless', '👁️', 2500),
    (v_season_id, 30, 'free', 'ghost_marker', 'Gold Eye Marker', '👁️', 3500)
  ON CONFLICT DO NOTHING;

  -- Premium track
  INSERT INTO darkness_pass_tiers (season_id, tier_number, track, reward_type, reward_name, reward_icon, xp_required) VALUES
    (v_season_id, 1, 'premium', 'flashlight_skin', 'Blood Red Beam', '🔴', 50),
    (v_season_id, 3, 'premium', 'coins', '200 Coins', '🪙', 150),
    (v_season_id, 5, 'premium', 'room_theme', 'Hospital Ward', '🏥', 300),
    (v_season_id, 8, 'premium', 'entity_skin', 'Glitch Shadow', '👾', 500),
    (v_season_id, 10, 'premium', 'death_animation', 'Screen Crack', '🔨', 700),
    (v_season_id, 13, 'premium', 'second_chance', '3 Second Chances', '❤️', 950),
    (v_season_id, 15, 'premium', 'flashlight_skin', 'UV Purple Beam', '🟣', 1200),
    (v_season_id, 18, 'premium', 'room_theme', 'The Basement', '⛓️', 1500),
    (v_season_id, 20, 'premium', 'entity_unlock', 'The Doppelganger', '🪞', 1800),
    (v_season_id, 25, 'premium', 'ghost_marker', 'Bleeding Eye', '🩸', 2500),
    (v_season_id, 30, 'premium', 'title', 'Abyss Walker', '⛓️', 3500)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE darkness_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE darkness_pass_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE darkness_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dps_select" ON darkness_pass_seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpt_select" ON darkness_pass_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpp_select" ON darkness_pass_progress FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "dpp_insert" ON darkness_pass_progress FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "ci_select" ON cosmetic_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "pi_select" ON player_inventory FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "pi_insert" ON player_inventory FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

-- Anon read for pass info
CREATE POLICY "dps_anon" ON darkness_pass_seasons FOR SELECT TO anon USING (true);
CREATE POLICY "dpt_anon" ON darkness_pass_tiers FOR SELECT TO anon USING (true);
