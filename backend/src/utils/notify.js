const pool = require('../db/pool');

async function notify(userId, type, title, body = null, orderId = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, body, order_id) VALUES ($1,$2,$3,$4,$5)',
      [userId, type, title, body, orderId]
    );
  } catch (err) {
    console.error('notify error:', err.message);
  }
}

module.exports = notify;
