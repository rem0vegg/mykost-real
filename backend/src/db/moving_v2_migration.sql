-- ============================================================
-- MyKost Moving V2 Migration
-- Jalankan SEKALI di development. Untuk production, backup data dulu.
-- ============================================================

-- 1. Drop FK ke moving_orders di tabel lain agar bisa drop tabel
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_moving_order_id_fkey;
DROP TABLE IF EXISTS moving_order_status_history;
DROP TABLE IF EXISTS moving_orders;

-- 2. Vehicle types (data statis, diseed sekali)
CREATE TABLE IF NOT EXISTS vehicle_types (
  type              VARCHAR(20) PRIMARY KEY
                      CHECK (type IN ('MOTORCYCLE','VAN','PICKUP_BOX')),
  rate_per_km       INT  NOT NULL,
  max_capacity_kg   INT  NOT NULL,
  recommended_for   TEXT NOT NULL
);

INSERT INTO vehicle_types (type, rate_per_km, max_capacity_kg, recommended_for) VALUES
  ('MOTORCYCLE', 2700,    50,   'Barang ringan: koper, tas, kardus kecil'),
  ('VAN',        13000,   500,  'Barang sedang: kasur lipat, kardus banyak, barang medium'),
  ('PICKUP_BOX', 20000,   1500, 'Barang besar/berat: lemari, kasur spring, perabot')
ON CONFLICT (type) DO NOTHING;

-- 3. Moving orders (desain baru)
--
-- Status flow:
--   DRAFT → SUBMITTED → INSTANT_CONFIRMED ─┬→ ACCEPTED → ON_GOING → COMPLETED
--                      → REVIEW_REQUIRED  ─┘
--   ACCEPTED / ON_GOING → INVALID (driver report mismatch)
--   INVALID → (user rebook → order baru DRAFT)
--   any non-terminal → CANCELLED
CREATE TABLE moving_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mover_id              UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Step 1: Lokasi
  pickup_location       TEXT NOT NULL,
  pickup_latitude       DECIMAL(10,8),
  pickup_longitude      DECIMAL(11,8),
  dropoff_location      TEXT NOT NULL,
  dropoff_latitude      DECIMAL(10,8),
  dropoff_longitude     DECIMAL(11,8),
  distance_km           DECIMAL(8,2) NOT NULL CHECK (distance_km > 0),

  -- Step 2: Tipe pindahan
  move_type             VARCHAR(10) NOT NULL
                          CHECK (move_type IN ('RINGAN','SEDANG','BERAT')),

  -- Step 3: Kendaraan
  vehicle_type          VARCHAR(20) NOT NULL REFERENCES vehicle_types(type),
  vehicle_mismatch_warned BOOLEAN DEFAULT FALSE,

  -- Step 4: Info tambahan
  pickup_floor          INT NOT NULL DEFAULT 1 CHECK (pickup_floor >= 1),
  dropoff_floor         INT NOT NULL DEFAULT 1 CHECK (dropoff_floor >= 1),
  has_lift              BOOLEAN DEFAULT FALSE,
  notes                 TEXT,

  -- Step 5: Validasi barang besar
  has_large_items       BOOLEAN DEFAULT FALSE,

  -- Step 6: Foto (array path relatif)
  photo_urls            TEXT[] DEFAULT '{}',

  -- Pricing breakdown (semua dalam Rupiah, sudah final)
  base_price            INT NOT NULL CHECK (base_price >= 0),
  surcharge             INT NOT NULL DEFAULT 0 CHECK (surcharge >= 0),
  addon_price           INT NOT NULL DEFAULT 0 CHECK (addon_price >= 0),
  estimated_price       INT NOT NULL CHECK (estimated_price > 0),
  price_min             INT,   -- hanya terisi jika requires_review
  price_max             INT,   -- hanya terisi jika requires_review
  final_price           INT,   -- terisi setelah COMPLETED

  -- Add-ons
  is_round_trip         BOOLEAN DEFAULT FALSE,
  is_door_to_door       BOOLEAN DEFAULT FALSE,

  -- Review flag
  requires_review       BOOLEAN DEFAULT FALSE,

  -- Status
  status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN (
                            'DRAFT','SUBMITTED','INSTANT_CONFIRMED',
                            'REVIEW_REQUIRED','ACCEPTED','ON_GOING',
                            'COMPLETED','INVALID','CANCELLED'
                          )),

  -- Alasan INVALID (diisi oleh driver)
  invalid_reason        VARCHAR(30)
                          CHECK (invalid_reason IN (
                            'OVER_CAPACITY','BARANG_TIDAK_SESUAI','TIDAK_AMAN'
                          )),

  -- Referensi ke order asli jika ini adalah rebook
  rebooked_from         UUID REFERENCES moving_orders(id) ON DELETE SET NULL,

  scheduled_date        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Driver mismatch reports
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

-- 5. Status history (rebuilt)
CREATE TABLE moving_order_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES moving_orders(id) ON DELETE CASCADE,
  from_status  VARCHAR(30),
  to_status    VARCHAR(30) NOT NULL,
  note         TEXT,
  changed_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Kembalikan FK messages → moving_orders
ALTER TABLE messages
  ADD CONSTRAINT messages_moving_order_id_fkey
  FOREIGN KEY (moving_order_id) REFERENCES moving_orders(id) ON DELETE CASCADE;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_moving_orders_user        ON moving_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_moving_orders_mover       ON moving_orders(mover_id);
CREATE INDEX IF NOT EXISTS idx_moving_orders_status      ON moving_orders(status);
CREATE INDEX IF NOT EXISTS idx_moving_orders_move_type   ON moving_orders(move_type);
CREATE INDEX IF NOT EXISTS idx_moving_orders_created     ON moving_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_reports_order      ON driver_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_moving_history_order      ON moving_order_status_history(order_id);
