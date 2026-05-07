CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'agent', 'mover')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  kota VARCHAR(255),
  location VARCHAR(255),
  avatar_url VARCHAR(500),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    CHECK (status IN ('pending_payment', 'finding_agent', 'assigned', 'completed', 'refunded', 'cancelled')),
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

  photo_urls            TEXT[] DEFAULT '{}',

  base_price            INT NOT NULL CHECK (base_price >= 0),
  surcharge             INT NOT NULL DEFAULT 0 CHECK (surcharge >= 0),
  addon_price           INT NOT NULL DEFAULT 0 CHECK (addon_price >= 0),
  estimated_price       INT NOT NULL CHECK (estimated_price > 0),
  price_min             INT,
  price_max             INT,
  final_price           INT,

  is_round_trip         BOOLEAN DEFAULT FALSE,
  is_door_to_door       BOOLEAN DEFAULT FALSE,

  requires_review       BOOLEAN DEFAULT FALSE,

  status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN (
                            'DRAFT','SUBMITTED','INSTANT_CONFIRMED',
                            'REVIEW_REQUIRED','ACCEPTED','ON_GOING',
                            'COMPLETED','INVALID','CANCELLED'
                          )),

  invalid_reason        VARCHAR(30)
                          CHECK (invalid_reason IN (
                            'OVER_CAPACITY','BARANG_TIDAK_SESUAI','TIDAK_AMAN'
                          )),

  rebooked_from         UUID REFERENCES moving_orders(id) ON DELETE SET NULL,

  scheduled_date        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

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
  order_id UUID REFERENCES survey_orders(id) ON DELETE SET NULL,
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
