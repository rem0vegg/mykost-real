-- ============================================================
-- Migration 003: Universal account architecture
-- Satu akun dapat memiliki banyak capability (customer/mover/surveyor)
-- tanpa perlu daftar ulang.
-- Idempotent.
-- ============================================================

-- ── user_capabilities ────────────────────────────────────────────────
-- Capability terpisah dari users.role (legacy). Setiap user otomatis
-- memiliki capability 'customer'. Mover/surveyor di-grant via apply flow.
CREATE TABLE IF NOT EXISTS user_capabilities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability   VARCHAR(20) NOT NULL
                 CHECK (capability IN ('customer','mover','surveyor')),
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','suspended','pending_review')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, capability)
);
CREATE INDEX IF NOT EXISTS idx_user_capabilities_user ON user_capabilities(user_id);

-- Backfill capability dari kolom users.role yang lama
INSERT INTO user_capabilities (user_id, capability, status)
SELECT id, 'customer', 'active' FROM users
ON CONFLICT (user_id, capability) DO NOTHING;

INSERT INTO user_capabilities (user_id, capability, status)
SELECT id, 'mover', 'active' FROM users WHERE role = 'mover'
ON CONFLICT (user_id, capability) DO NOTHING;

INSERT INTO user_capabilities (user_id, capability, status)
SELECT id, 'surveyor', 'active' FROM users WHERE role = 'agent'
ON CONFLICT (user_id, capability) DO NOTHING;

-- ── mover_profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mover_profiles (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_types    TEXT[] DEFAULT '{}',     -- e.g. ['MOTORCYCLE','VAN']
  service_area     TEXT,
  bio              TEXT,
  is_available     BOOLEAN DEFAULT TRUE,
  total_jobs       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── surveyor_profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveyor_profiles (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kota             VARCHAR(100),
  bio              TEXT,
  is_available     BOOLEAN DEFAULT TRUE,
  total_surveys    INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill surveyor profiles dari kolom users.kota
INSERT INTO surveyor_profiles (user_id, kota)
SELECT id, kota FROM users WHERE role = 'agent' AND kota IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO mover_profiles (user_id)
SELECT id FROM users WHERE role = 'mover'
ON CONFLICT (user_id) DO NOTHING;
