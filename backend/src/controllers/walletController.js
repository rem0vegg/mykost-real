const Joi = require('joi');
const pool = require('../db/pool');

const withdrawSchema = Joi.object({
  amount:             Joi.number().integer().min(10000).required(),
  destination_type:   Joi.string().valid('bank_transfer', 'e_wallet').required(),
  destination_name:   Joi.string().min(2).max(100).required(),
  destination_number: Joi.string().min(5).max(50).required(),
  bank_code:          Joi.string().max(20).allow('', null),
});

/**
 * GET /api/wallet
 */
async function getWallet(req, res) {
  const walletR = await pool.query(
    `SELECT balance, updated_at FROM user_wallets WHERE user_id = $1`,
    [req.user.id]
  );

  if (walletR.rows.length === 0) {
    await pool.query(`INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [req.user.id]);
  }

  const balance = walletR.rows[0]?.balance || 0;

  const txR = await pool.query(
    `SELECT id, type, category, amount, reference_id, description, status, created_at
     FROM wallet_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  const pendingWithdrawR = await pool.query(
    `SELECT id, amount, destination_type, destination_name, destination_number,
            bank_code, status, created_at
     FROM withdrawals
     WHERE user_id = $1 AND status IN ('pending','processing')
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.json({
    balance,
    transactions:        txR.rows,
    pending_withdrawals: pendingWithdrawR.rows,
  });
}

/**
 * GET /api/wallet/transactions
 */
async function getTransactions(req, res) {
  const page  = Math.max(1, parseInt(req.query.page  || '1'));
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit || '20')));
  const offset = (page - 1) * limit;

  const txR = await pool.query(
    `SELECT id, type, category, amount, reference_id, description, status, created_at
     FROM wallet_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  res.json({ transactions: txR.rows, page, limit });
}

/**
 * POST /api/wallet/withdraw
 */
async function requestWithdrawal(req, res) {
  const { error, value } = withdrawSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock wallet row
    const walletR = await client.query(
      `SELECT balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`,
      [req.user.id]
    );
    const balance = parseInt(walletR.rows[0]?.balance || 0);

    if (balance < value.amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Saldo tidak cukup. Saldo Anda: Rp ${balance.toLocaleString('id-ID')}` });
    }

    // Kurangi saldo
    await client.query(
      `UPDATE user_wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`,
      [value.amount, req.user.id]
    );

    // Buat record withdrawal
    const wdR = await client.query(
      `INSERT INTO withdrawals (user_id, amount, destination_type, destination_name, destination_number, bank_code)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [req.user.id, value.amount, value.destination_type, value.destination_name, value.destination_number, value.bank_code || null]
    );

    // Catat transaksi wallet
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, category, amount, reference_id, description)
       VALUES ($1,'debit','withdrawal_debit',$2,$3,$4)`,
      [req.user.id, value.amount, wdR.rows[0].id, `Penarikan ke ${value.destination_name}`]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      withdrawal_id: wdR.rows[0].id,
      amount:        value.amount,
      message:       'Permintaan penarikan berhasil. Proses 1-3 hari kerja.',
    });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Helper: tambah kredit ke wallet (digunakan oleh refund flow).
 */
async function creditWallet(client, userId, amount, category, referenceId, description) {
  await client.query(
    `INSERT INTO user_wallets (user_id, balance) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET balance = user_wallets.balance + $2, updated_at = NOW()`,
    [userId, amount]
  );
  await client.query(
    `INSERT INTO wallet_transactions (user_id, type, category, amount, reference_id, description)
     VALUES ($1,'credit',$2,$3,$4,$5)`,
    [userId, category, amount, referenceId, description]
  );
}

module.exports = { getWallet, getTransactions, requestWithdrawal, creditWallet };
