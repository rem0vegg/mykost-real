ALTER TABLE mover_profiles
  ADD COLUMN IF NOT EXISTS plate_number TEXT,
  ADD COLUMN IF NOT EXISTS stnk_url     TEXT,
  ADD COLUMN IF NOT EXISTS sim_url      TEXT;
