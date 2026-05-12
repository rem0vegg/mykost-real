const Joi = require('joi');
const pool = require('../db/pool');
const { creditWallet } = require('./walletController');

const COMPLAINT_CATEGORIES = [
  'service_quality',
  'late_delivery',
  'damaged_item',
  'rude_behavior',
  'wrong_info',
  'overcharge',
  'other',
];

const createSchema = Joi.object({
  order_id:    Joi.string().uuid().required(),
  order_type:  Joi.string().valid('survey','moving').required(),
  category:    Joi.string().valid(...COMPLAINT_CATEGORIES).required(),
  description: Joi.string().min(10).max(2000).required(),
});

const resolveSchema = Joi.object({
  resolution:    Joi.string().min(5).max(1000).required(),
  refund_amount: Joi.number().integer().min(0).default(0),
});

/**
 * POST /complaints
 */
async function createComplaint(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const tableMap = { survey: 'survey_orders', moving: 'moving_orders' };
  const t = tableMap[value.order_type];
  const r = await pool.query(`SELECT user_id, status FROM ${t} WHERE id = $1`, [value.order_id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
  if (r.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const result = await pool.query(
    `INSERT INTO complaints (user_id, order_id, order_type, category, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.user.id, value.order_id, value.order_type, value.category, value.description]
  );

  res.status(201).json({ complaint: result.rows[0] });
}

/**
 * GET /complaints/me
 */
async function getMyComplaints(req, res) {
  const result = await pool.query(
    `SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ complaints: result.rows });
}

/**
 * GET /complaints/order/:order_type/:order_id
 */
async function getOrderComplaints(req, res) {
  const { order_type, order_id } = req.params;
  const result = await pool.query(
    `SELECT * FROM complaints
     WHERE user_id = $1 AND order_id = $2 AND order_type = $3
     ORDER BY created_at DESC`,
    [req.user.id, order_id, order_type]
  );
  res.json({ complaints: result.rows });
}

/**
 * PATCH /complaints/:id/resolve
 * Admin menyelesaikan komplain; jika ada refund_amount, dana masuk ke wallet user.
 */
async function resolveComplaint(req, res) {
  const { id } = req.params;
  const { error, value } = resolveSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const complaintR = await pool.query('SELECT * FROM complaints WHERE id = $1', [id]);
  if (complaintR.rows.length === 0) return res.status(404).json({ error: 'Komplain tidak ditemukan' });
  const complaint = complaintR.rows[0];
  if (complaint.status === 'resolved') return res.status(400).json({ error: 'Komplain sudah diselesaikan' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE complaints
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1`,
      [id]
    );

    if (value.refund_amount > 0) {
      await creditWallet(
        client, complaint.user_id, value.refund_amount,
        'complaint_refund', id,
        `Penyelesaian komplain #${id.slice(0,8)}: ${value.resolution}`
      );
    }

    await client.query('COMMIT');
    res.json({
      success:       true,
      refund_amount: value.refund_amount,
      message:       value.refund_amount > 0
        ? `Komplain diselesaikan. Dana Rp ${value.refund_amount.toLocaleString('id-ID')} dikembalikan ke saldo user.`
        : 'Komplain diselesaikan.',
    });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { createComplaint, getMyComplaints, getOrderComplaints, resolveComplaint, COMPLAINT_CATEGORIES };
