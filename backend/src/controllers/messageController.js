const Joi = require('joi');
const pool = require('../db/pool');
const notify = require('../utils/notify');

const sendSchema = Joi.object({
  message_text: Joi.string().min(1).required(),
  to_user_id: Joi.string().uuid().required(),
  moving_order_id: Joi.string().uuid().allow(null),
});

async function getOrderParticipants(orderId, type) {
  if (type === 'moving') {
    const r = await pool.query('SELECT user_id, mover_id FROM moving_orders WHERE id=$1', [orderId]);
    return r.rows[0] || null;
  }
  const r = await pool.query('SELECT user_id, agent_id FROM survey_orders WHERE id=$1', [orderId]);
  return r.rows[0] || null;
}

function isParticipant(order, userId, type) {
  if (type === 'moving') return order.user_id === userId || order.mover_id === userId;
  return order.user_id === userId || order.agent_id === userId;
}

async function getMessages(req, res) {
  const { orderId } = req.params;
  const { type } = req.query; // 'survey' or 'moving'

  const order = await getOrderParticipants(orderId, type);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!isParticipant(order, req.user.id, type)) return res.status(403).json({ error: 'Access denied' });

  let result;
  if (type === 'moving') {
    result = await pool.query(
      `SELECT m.*, u.name as from_name, u.role as from_role
       FROM messages m
       JOIN users u ON u.id = m.from_user_id
       WHERE m.moving_order_id = $1
       ORDER BY m.created_at ASC`,
      [orderId]
    );
  } else {
    result = await pool.query(
      `SELECT m.*, u.name as from_name, u.role as from_role
       FROM messages m
       JOIN users u ON u.id = m.from_user_id
       WHERE m.order_id = $1
       ORDER BY m.created_at ASC`,
      [orderId]
    );
  }

  // Mark messages as read for recipient
  if (type === 'moving') {
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE moving_order_id = $1 AND to_user_id = $2',
      [orderId, req.user.id]
    );
  } else {
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE order_id = $1 AND to_user_id = $2',
      [orderId, req.user.id]
    );
  }

  res.json({ messages: result.rows });
}

async function sendMessage(req, res) {
  const { orderId } = req.params;
  const { error, value } = sendSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { message_text, to_user_id, moving_order_id } = value;
  const type = moving_order_id ? 'moving' : 'survey';
  const effectiveOrderId = moving_order_id || orderId;

  const order = await getOrderParticipants(effectiveOrderId, type);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!isParticipant(order, req.user.id, type)) return res.status(403).json({ error: 'Access denied' });
  if (!isParticipant(order, to_user_id, type)) {
    return res.status(403).json({ error: 'Recipient is not a participant in this order' });
  }

  const result = await pool.query(
    `INSERT INTO messages (order_id, moving_order_id, from_user_id, to_user_id, message_text)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      moving_order_id ? null : orderId,
      moving_order_id || null,
      req.user.id,
      to_user_id,
      message_text,
    ]
  );

  const msg = result.rows[0];
  const withUser = await pool.query(
    'SELECT m.*, u.name as from_name, u.role as from_role FROM messages m JOIN users u ON u.id = m.from_user_id WHERE m.id = $1',
    [msg.id]
  );

  await notify(to_user_id, 'new_message', `Pesan dari ${req.user.name}`,
    message_text.length > 80 ? message_text.slice(0, 80) + '…' : message_text,
    moving_order_id ? null : orderId);

  res.status(201).json({ message: withUser.rows[0] });
}

async function getUnreadCount(req, res) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM messages WHERE to_user_id = $1 AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ count: parseInt(result.rows[0].count) });
}

module.exports = { getMessages, sendMessage, getUnreadCount };
