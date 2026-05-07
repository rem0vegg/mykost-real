-- ============================================================
-- Migration 002: payment flow, evidence photos, operational details,
-- reviews, complaints, generic notifications
-- Idempotent — safe untuk dijalankan berulang.
-- ============================================================

-- ── moving_orders: payment + evidence + operational ──────────────────
ALTER TABLE moving_orders
  ADD COLUMN IF NOT EXISTS payment_status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pickup_photo_urls     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS delivery_photo_urls   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_parking           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS narrow_alley          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_fragile           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_disassembly     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS estimated_item_count  INT,
  ADD COLUMN IF NOT EXISTS completed_at          TIMESTAMPTZ;

-- Re-create payment_status check
ALTER TABLE moving_orders DROP CONSTRAINT IF EXISTS moving_orders_payment_status_check;
ALTER TABLE moving_orders
  ADD CONSTRAINT moving_orders_payment_status_check
  CHECK (payment_status IN ('pending','paid','refunded'));

-- Status enum extended dengan PENDING_PAYMENT
ALTER TABLE moving_orders DROP CONSTRAINT IF EXISTS moving_orders_status_check;
ALTER TABLE moving_orders
  ADD CONSTRAINT moving_orders_status_check
  CHECK (status IN (
    'DRAFT','SUBMITTED','PENDING_PAYMENT','INSTANT_CONFIRMED',
    'REVIEW_REQUIRED','ACCEPTED','ON_GOING',
    'COMPLETED','INVALID','CANCELLED'
  ));

ALTER TABLE moving_orders ALTER COLUMN status SET DEFAULT 'PENDING_PAYMENT';
ALTER TABLE moving_orders ALTER COLUMN move_type SET DEFAULT 'RINGAN';

-- ── survey_orders: result_submitted state ────────────────────────────
ALTER TABLE survey_orders DROP CONSTRAINT IF EXISTS survey_orders_status_check;
ALTER TABLE survey_orders
  ADD CONSTRAINT survey_orders_status_check
  CHECK (status IN ('pending_payment','finding_agent','assigned','result_submitted','completed','refunded','cancelled'));

-- ── notifications: generic order_id (drop FK ke survey_orders) ───────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_order_id_fkey;
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(20);
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_order_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_order_type_check
  CHECK (order_type IS NULL OR order_type IN ('survey','moving'));

-- ── reviews ──────────────────────────────────────────────────────────
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

-- ── complaints ───────────────────────────────────────────────────────
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

-- ── completed_at backfill ────────────────────────────────────────────
-- Setelah migrasi, isi completed_at untuk order yang sudah COMPLETED
UPDATE moving_orders mo
SET completed_at = COALESCE(
  (SELECT MAX(created_at) FROM moving_order_status_history h
    WHERE h.order_id = mo.id AND h.to_status = 'COMPLETED'),
  mo.updated_at
)
WHERE mo.status = 'COMPLETED' AND mo.completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_moving_orders_completed_at ON moving_orders(completed_at);
