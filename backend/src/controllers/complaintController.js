const Joi = require('joi');
const pool = require('../db/pool');

const COMPLAINT_CATEGORIES = [
  'service_quality',   // Kualitas layanan
  'late_delivery',     // Keterlambatan
  'damaged_item',      // Barang rusak
  'rude_behavior',     // Perilaku tidak sopan
  'wrong_info',        // Info tidak sesuai
  'overcharge',        // Biaya tidak wajar
  'other',
];

const createSchema = Joi.object({
  order_id:    Joi.string().uuid().required(),
  order_type:  Joi.string().valid('survey','moving').required(),
  category:    Joi.string().valid(...COMPLAINT_CATEGORIES).required(),
  description: Joi.string().min(10).max(2000).required(),
});

/**
 * POST /complaints
 * User mengajukan komplain atas order yang sudah selesai (atau dibatalkan).
 */
async function createComplaint(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  // Validasi kepemilikan order
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
 * List komplain milik user yang login.
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
 * Komplain spesifik untuk satu order.
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

module.exports = { createComplaint, getMyComplaints, getOrderComplaints, COMPLAINT_CATEGORIES };
