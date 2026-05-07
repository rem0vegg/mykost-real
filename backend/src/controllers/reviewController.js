const Joi = require('joi');
const pool = require('../db/pool');
const notify = require('../utils/notify');

const createSchema = Joi.object({
  order_id:    Joi.string().uuid().required(),
  order_type:  Joi.string().valid('survey','moving').required(),
  rating:      Joi.number().integer().min(1).max(5).required(),
  comment:     Joi.string().allow('', null).max(1000),
});

/**
 * POST /reviews
 * User memberi ulasan untuk agent (survey) atau mover (moving).
 */
async function createReview(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  // Cari reviewee (agent untuk survey, mover untuk moving) dari order
  let revieweeId, orderInfo;
  if (value.order_type === 'survey') {
    const r = await pool.query('SELECT user_id, agent_id, kost_name FROM survey_orders WHERE id = $1', [value.order_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
    if (r.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
    if (!r.rows[0].agent_id) return res.status(400).json({ error: 'Order tidak punya agent' });
    revieweeId = r.rows[0].agent_id;
    orderInfo = r.rows[0];
  } else {
    const r = await pool.query('SELECT user_id, mover_id FROM moving_orders WHERE id = $1', [value.order_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
    if (r.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
    if (!r.rows[0].mover_id) return res.status(400).json({ error: 'Order tidak punya mover' });
    revieweeId = r.rows[0].mover_id;
    orderInfo = r.rows[0];
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (user_id, reviewee_id, order_id, order_type, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, revieweeId, value.order_id, value.order_type, value.rating, value.comment || null]
    );

    await notify(
      revieweeId,
      'new_review',
      `Anda mendapat ulasan ${value.rating}⭐`,
      value.comment ? value.comment.slice(0, 80) : 'Pengguna memberi ulasan tanpa komentar.',
      value.order_id,
      value.order_type
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Anda sudah memberi ulasan untuk order ini' });
    }
    throw err;
  }
}

/**
 * GET /reviews?reviewee_id=X
 * List ulasan untuk seorang user (agent atau mover).
 */
async function listReviews(req, res) {
  const { reviewee_id } = req.query;
  if (!reviewee_id) return res.status(400).json({ error: 'reviewee_id wajib' });

  const result = await pool.query(
    `SELECT r.*, u.name AS reviewer_name
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.reviewee_id = $1
     ORDER BY r.created_at DESC LIMIT 50`,
    [reviewee_id]
  );

  const summary = await pool.query(
    `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1) AS average
     FROM reviews WHERE reviewee_id = $1`,
    [reviewee_id]
  );

  res.json({ reviews: result.rows, summary: summary.rows[0] });
}

/**
 * GET /reviews/order/:order_type/:order_id
 * Cek apakah user sudah memberi ulasan untuk order ini.
 */
async function getOrderReview(req, res) {
  const { order_type, order_id } = req.params;
  const result = await pool.query(
    `SELECT * FROM reviews WHERE user_id = $1 AND order_id = $2 AND order_type = $3`,
    [req.user.id, order_id, order_type]
  );
  res.json({ review: result.rows[0] || null });
}

module.exports = { createReview, listReviews, getOrderReview };
