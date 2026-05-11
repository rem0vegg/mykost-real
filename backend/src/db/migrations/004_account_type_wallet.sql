-- ============================================================
-- Migration 004: account_type, digital wallet, withdrawals
-- Idempotent.
-- ============================================================

-- ── account_type on users ─────────────────────────────────────────────
-- Menentukan tipe akun saat registrasi. customer tidak boleh apply
-- sebagai mover/surveyor — harus buat akun baru.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE users ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'customer'
      CHECK (account_type IN ('customer','mover','surveyor'));
  END IF;
END $$;

-- Backfill dari users.role yang lama
UPDATE users SET account_type = 'mover'    WHERE role = 'mover'  AND account_type = 'customer';
UPDATE users SET account_type = 'surveyor' WHERE role = 'agent'  AND account_type = 'customer';

-- ── user_wallets ──────────────────────────────────────────────────────
-- Saldo digital per user (satuan sen IDR / integer Rupiah).
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Otomatis buat wallet untuk setiap user yang sudah ada
INSERT INTO user_wallets (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ── wallet_transactions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           VARCHAR(10) NOT NULL CHECK (type IN ('credit','debit')),
  category       VARCHAR(50) NOT NULL,
  -- category values: order_payment, order_refund, complaint_refund,
  --                  withdrawal_debit, topup
  amount         BIGINT NOT NULL CHECK (amount > 0),
  reference_id   TEXT,        -- order id atau withdrawal id
  description    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'completed'
                   CHECK (status IN ('completed','pending','failed')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

-- ── withdrawals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount             BIGINT NOT NULL CHECK (amount > 0),
  destination_type   VARCHAR(20) NOT NULL CHECK (destination_type IN ('bank_transfer','e_wallet')),
  destination_name   VARCHAR(100) NOT NULL,
  destination_number VARCHAR(50) NOT NULL,
  bank_code          VARCHAR(20),    -- kode bank, e.g. BCA, BNI, GOPAY
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','processing','completed','rejected')),
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id, created_at DESC);

-- ── midtrans_payments ─────────────────────────────────────────────────
-- Tracking transaksi Midtrans agar webhook bisa divalidasi.
CREATE TABLE IF NOT EXISTS midtrans_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref      TEXT NOT NULL UNIQUE,  -- format: survey-{id} atau moving-{id}
  order_id       UUID NOT NULL,
  order_type     VARCHAR(10) NOT NULL CHECK (order_type IN ('survey','moving')),
  user_id        UUID NOT NULL REFERENCES users(id),
  amount         BIGINT NOT NULL,
  snap_token     TEXT,
  snap_redirect  TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','expired','failed','cancelled')),
  midtrans_txn   JSONB,               -- raw notification dari Midtrans
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_midtrans_order_ref ON midtrans_payments(order_ref);
