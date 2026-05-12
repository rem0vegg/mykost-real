const pool = require('../db/pool');

/**
 * Buat notifikasi baru.
 * @param {string} userId        - target user
 * @param {string} type          - kode tipe (e.g. 'new_message', 'moving_accepted')
 * @param {string} title         - judul singkat
 * @param {string|null} body     - detail (opsional)
 * @param {string|null} orderId  - UUID order terkait
 * @param {string|null} orderType - 'survey' atau 'moving'
 */
async function notify(userId, type, title, body = null, orderId = null, orderType = null) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, order_id, order_type)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, type, title, body, orderId, orderType]
    );
  } catch (err) {
    console.error('notify error:', err.message);
  }
}

module.exports = notify;
