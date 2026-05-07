CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  -- Legacy. Setiap user baru default 'user'. Capability sebenarnya disimpan di user_capabilities.
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'mover')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  kota VARCHAR(255),
  location VARCHAR(255),
  avatar_url VARCHAR(500),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Universal account: setiap user dapat memiliki banyak capability
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

CREATE TABLE IF NOT EXISTS mover_profiles (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_types    TEXT[] DEFAULT '{}',
  service_area     TEXT,
  bio              TEXT,
  is_available     BOOLEAN DEFAULT TRUE,
  total_jobs       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surveyor_profiles (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kota             VARCHAR(100),
  bio              TEXT,
  is_available     BOOLEAN DEFAULT TRUE,
  total_surveys    INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Survey order status flow:
--   pending_payment → finding_agent → assigned → completed
--                                              → refunded (no agent / user cancel)
CREATE TABLE IF NOT EXISTS survey_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Kost location
  kost_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  kecamatan VARCHAR(255),
  kota VARCHAR(255),
  -- User notes & optional attachment
  notes TEXT,
  attachment_url VARCHAR(500),
  -- Payment (flat Rp 75.000)
  price INT NOT NULL DEFAULT 75000,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  -- Order status
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'finding_agent', 'assigned', 'result_submitted', 'completed', 'refunded', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES survey_orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  note TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Survey results submitted by agent (required: notes + min 1 photo)
CREATE TABLE IF NOT EXISTS survey_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES survey_orders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  notes TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_result_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES survey_results(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Moving v2: vehicles, orders, history, driver reports ──────────────────────
CREATE TABLE IF NOT EXISTS vehicle_types (
  type            VARCHAR(20) PRIMARY KEY
                    CHECK (type IN ('MOTORCYCLE','VAN','PICKUP_BOX')),
  rate_per_km     INT  NOT NULL,
  max_capacity_kg INT  NOT NULL,
  recommended_for TEXT NOT NULL
);

INSERT INTO vehicle_types (type, rate_per_km, max_capacity_kg, recommended_for) VALUES
  ('MOTORCYCLE', 2700,    50,   'Barang ringan: koper, tas, kardus kecil'),
  ('VAN',        13000,   500,  'Barang sedang: kasur lipat, kardus banyak, barang medium'),
  ('PICKUP_BOX', 20000,   1500, 'Barang besar/berat: lemari, kasur spring, perabot')
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS moving_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mover_id              UUID REFERENCES users(id) ON DELETE SET NULL,

  pickup_location       TEXT NOT NULL,
  pickup_latitude       DECIMAL(10,8),
  pickup_longitude      DECIMAL(11,8),
  dropoff_location      TEXT NOT NULL,
  dropoff_latitude      DECIMAL(10,8),
  dropoff_longitude     DECIMAL(11,8),
  distance_km           DECIMAL(8,2) NOT NULL CHECK (distance_km > 0),

  move_type             VARCHAR(10) NOT NULL DEFAULT 'RINGAN'
                          CHECK (move_type IN ('RINGAN','SEDANG','BERAT')),

  vehicle_type          VARCHAR(20) NOT NULL REFERENCES vehicle_types(type),
  vehicle_mismatch_warned BOOLEAN DEFAULT FALSE,

  pickup_floor          INT NOT NULL DEFAULT 1 CHECK (pickup_floor >= 1),
  dropoff_floor         INT NOT NULL DEFAULT 1 CHECK (dropoff_floor >= 1),
  has_lift              BOOLEAN DEFAULT FALSE,
  notes                 TEXT,

  has_large_items       BOOLEAN DEFAULT FALSE,

  -- Operational details (untuk mover)
  has_parking           BOOLEAN DEFAULT FALSE,
  narrow_alley          BOOLEAN DEFAULT FALSE,
  has_fragile           BOOLEAN DEFAULT FALSE,
  needs_disassembly     BOOLEAN DEFAULT FALSE,
  estimated_item_count  INT,

  photo_urls            TEXT[] DEFAULT '{}',           -- foto barang dari user
  pickup_photo_urls     TEXT[] DEFAULT '{}',           -- bukti kondisi saat pickup (mover)
  delivery_photo_urls   TEXT[] DEFAULT '{}',           -- bukti kondisi saat delivery (mover)

  base_price            INT NOT NULL CHECK (base_price >= 0),
  surcharge             INT NOT NULL DEFAULT 0 CHECK (surcharge >= 0),
  addon_price           INT NOT NULL DEFAULT 0 CHECK (addon_price >= 0),
  estimated_price       INT NOT NULL CHECK (estimated_price > 0),
  price_min             INT,
  price_max             INT,
  final_price           INT,

  is_round_trip         BOOLEAN DEFAULT FALSE,
  is_door_to_door       BOOLEAN DEFAULT FALSE,

  payment_status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','paid','refunded')),

  requires_review       BOOLEAN DEFAULT FALSE,

  status                VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT'
                          CHECK (status IN (
                            'DRAFT','SUBMITTED','PENDING_PAYMENT','INSTANT_CONFIRMED',
                            'REVIEW_REQUIRED','ACCEPTED','ON_GOING',
                            'COMPLETED','INVALID','CANCELLED'
                          )),

  invalid_reason        VARCHAR(30)
                          CHECK (invalid_reason IN (
                            'OVER_CAPACITY','BARANG_TIDAK_SESUAI','TIDAK_AMAN'
                          )),

  rebooked_from         UUID REFERENCES moving_orders(id) ON DELETE SET NULL,

  scheduled_date        TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moving_orders_completed_at ON moving_orders(completed_at);

CREATE TABLE IF NOT EXISTS driver_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES moving_orders(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES users(id),
  reason      VARCHAR(30) NOT NULL
                CHECK (reason IN ('OVER_CAPACITY','BARANG_TIDAK_SESUAI','TIDAK_AMAN')),
  photo_url   VARCHAR(500) NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moving_order_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES moving_orders(id) ON DELETE CASCADE,
  from_status  VARCHAR(30),
  to_status    VARCHAR(30) NOT NULL,
  note         TEXT,
  changed_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES survey_orders(id) ON DELETE CASCADE,
  moving_order_id UUID REFERENCES moving_orders(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  order_id UUID,                              -- generic: bisa survey_order atau moving_order
  order_type VARCHAR(20)                      -- 'survey' atau 'moving'
    CHECK (order_type IS NULL OR order_type IN ('survey','moving')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_kota ON users(kota);
CREATE INDEX IF NOT EXISTS idx_survey_orders_user_id ON survey_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_orders_agent_id ON survey_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_survey_orders_status ON survey_orders(status);
CREATE INDEX IF NOT EXISTS idx_survey_orders_kota ON survey_orders(kota);
CREATE INDEX IF NOT EXISTS idx_moving_orders_user_id ON moving_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_moving_orders_mover_id ON moving_orders(mover_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- ── Reviews & Complaints ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL,
  order_type    VARCHAR(20) NOT NULL CHECK (order_type IN ('survey','moving')),
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, order_id, order_type)
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order    ON reviews(order_type, order_id);

CREATE TABLE IF NOT EXISTS complaints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL,
  order_type    VARCHAR(20) NOT NULL CHECK (order_type IN ('survey','moving')),
  category      VARCHAR(50) NOT NULL,
  description   TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_review','resolved')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_complaints_user  ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_order ON complaints(order_type, order_id);
