const pool = require('../db/pool');

async function getNotifications(req, res) {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  const unreadCount = result.rows.filter((n) => !n.is_read).length;
  res.json({ notifications: result.rows, unreadCount });
}

async function markAllRead(req, res) {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
}

async function markOneRead(req, res) {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
}

module.exports = { getNotifications, markAllRead, markOneRead };
