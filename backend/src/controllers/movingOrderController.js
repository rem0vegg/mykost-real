const Joi = require('joi');
const pool = require('../db/pool');

const createSchema = Joi.object({
  pickup_location: Joi.string().required(),
  delivery_location: Joi.string().required(),
  description: Joi.string().allow('', null),
  scheduled_date: Joi.date().iso().allow(null),
  budget: Joi.number().integer().positive().allow(null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('in_progress', 'completed', 'cancelled').required(),
  note: Joi.string().allow('', null),
});

async function createOrder(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { pickup_location, delivery_location, description, scheduled_date, budget } = value;
  const result = await pool.query(
    'INSERT INTO moving_orders (user_id, pickup_location, delivery_location, description, scheduled_date, budget) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [req.user.id, pickup_location, delivery_location, description || null, scheduled_date || null, budget || null]
  );

  const order = result.rows[0];
  await pool.query(
    'INSERT INTO moving_order_status_history (order_id, status, note, changed_by) VALUES ($1, $2, $3, $4)',
    [order.id, 'pending', 'Order created', req.user.id]
  );

  res.status(201).json({ order });
}

async function getUserOrders(req, res) {
  const result = await pool.query(
    `SELECT mo.*, u.name as mover_name, u.phone as mover_phone
     FROM moving_orders mo
     LEFT JOIN users u ON u.id = mo.mover_id
     WHERE mo.user_id = $1
     ORDER BY mo.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: result.rows });
}

async function getOrderById(req, res) {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT mo.*,
      owner.name as user_name, owner.phone as user_phone,
      mv.name as mover_name, mv.phone as mover_phone
     FROM moving_orders mo
     JOIN users owner ON owner.id = mo.user_id
     LEFT JOIN users mv ON mv.id = mo.mover_id
     WHERE mo.id = $1`,
    [id]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  const order = result.rows[0];

  if (order.user_id !== req.user.id && order.mover_id !== req.user.id && req.user.role !== 'mover') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const historyResult = await pool.query(
    `SELECT mosh.*, u.name as changed_by_name
     FROM moving_order_status_history mosh
     JOIN users u ON u.id = mosh.changed_by
     WHERE mosh.order_id = $1
     ORDER BY mosh.created_at ASC`,
    [id]
  );

  res.json({ order, history: historyResult.rows });
}

async function getAvailableOrders(req, res) {
  const result = await pool.query(
    `SELECT mo.*, u.name as user_name, u.phone as user_phone
     FROM moving_orders mo
     JOIN users u ON u.id = mo.user_id
     WHERE mo.status = 'pending'
     ORDER BY mo.created_at DESC`
  );
  res.json({ orders: result.rows });
}

async function getMoverOrders(req, res) {
  const result = await pool.query(
    `SELECT mo.*, u.name as user_name, u.phone as user_phone
     FROM moving_orders mo
     JOIN users u ON u.id = mo.user_id
     WHERE mo.mover_id = $1
     ORDER BY mo.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: result.rows });
}

async function acceptOrder(req, res) {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM moving_orders WHERE id = $1', [id]);

  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  const order = result.rows[0];

  if (order.status !== 'pending') {
    return res.status(400).json({ error: 'Order is no longer available' });
  }

  const updated = await pool.query(
    `UPDATE moving_orders SET mover_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [req.user.id, id]
  );

  await pool.query(
    'INSERT INTO moving_order_status_history (order_id, status, note, changed_by) VALUES ($1, $2, $3, $4)',
    [id, 'assigned', `Accepted by mover ${req.user.name}`, req.user.id]
  );

  res.json({ order: updated.rows[0] });
}

async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { error, value } = statusSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const result = await pool.query('SELECT * FROM moving_orders WHERE id = $1', [id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  const order = result.rows[0];

  if (order.mover_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the assigned mover can update this order' });
  }

  const updated = await pool.query(
    `UPDATE moving_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [value.status, id]
  );

  await pool.query(
    'INSERT INTO moving_order_status_history (order_id, status, note, changed_by) VALUES ($1, $2, $3, $4)',
    [id, value.status, value.note || null, req.user.id]
  );

  res.json({ order: updated.rows[0] });
}

module.exports = {
  createOrder, getUserOrders, getOrderById,
  getAvailableOrders, getMoverOrders, acceptOrder, updateOrderStatus,
};
