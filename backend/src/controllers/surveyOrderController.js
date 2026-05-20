const pool = require('../db/pool');
const notify = require('../utils/notify');
const { creditWallet } = require('./walletController');

// ─── helpers ────────────────────────────────────────────────────────────────

async function addHistory(orderId, status, note, userId) {
  await pool.query(
    'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,$2,$3,$4)',
    [orderId, status, note, userId]
  );
}

// ─── user actions ────────────────────────────────────────────────────────────

async function createOrder(req, res) {
  const { kost_name, address, latitude, longitude, kecamatan, kota, notes } = req.body;

  if (!kost_name || !address || !latitude || !longitude) {
    return res.status(400).json({ error: 'kost_name, address, latitude, longitude wajib diisi' });
  }

  const attachment_url = (req.files && req.files.length > 0)
    ? JSON.stringify(req.files.map((f) => `/uploads/${f.filename}`))
    : null;

  const result = await pool.query(
    `INSERT INTO survey_orders
       (user_id, kost_name, address, latitude, longitude, kecamatan, kota, notes, attachment_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [req.user.id, kost_name, address,
     parseFloat(latitude), parseFloat(longitude),
     kecamatan || null, kota || null, notes || null, attachment_url]
  );

  const order = result.rows[0];
  await addHistory(order.id, 'pending_payment', 'Order dibuat, menunggu pembayaran', req.user.id);
  res.status(201).json({ order });
}

async function getUserOrders(req, res) {
  const result = await pool.query(
    `SELECT so.*, u.name AS agent_name, u.phone AS agent_phone
     FROM survey_orders so
     LEFT JOIN users u ON u.id = so.agent_id
     WHERE so.user_id = $1
     ORDER BY so.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: result.rows });
}

async function payOrder(req, res) {
  const { id } = req.params;
  const check = await pool.query('SELECT * FROM survey_orders WHERE id=$1', [id]);
  if (!check.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
  const order = check.rows[0];

  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (order.status !== 'pending_payment') return res.status(400).json({ error: 'Order bukan dalam status menunggu pembayaran' });

  const updated = await pool.query(
    `UPDATE survey_orders
     SET status='finding_agent', payment_status='paid', updated_at=CURRENT_TIMESTAMP
     WHERE id=$1 RETURNING *`,
    [id]
  );
  await addHistory(id, 'finding_agent', 'Pembayaran diterima. Mencari agent di area kota...', req.user.id);
  // notify available agents in this kota
  const agents = await pool.query(
    "SELECT id FROM users WHERE role='agent' AND is_available=TRUE AND LOWER(TRIM(kota))=LOWER(TRIM($1))",
    [order.kota]
  );
  for (const a of agents.rows) {
    await notify(a.id, 'new_order', 'Order survei baru!',
      `Order untuk "${order.kost_name}" di ${order.kota} tersedia.`, id, 'survey');
  }
  res.json({ order: updated.rows[0] });
}

async function requestRefund(req, res) {
  const { id } = req.params;
  const check = await pool.query('SELECT * FROM survey_orders WHERE id=$1', [id]);
  if (!check.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
  const order = check.rows[0];

  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (order.status !== 'finding_agent') return res.status(400).json({ error: 'Refund hanya bisa diminta saat mencari agent' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE survey_orders
       SET status='refunded', payment_status='refunded', updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [id]
    );
    await addHistory(id, 'refunded', 'Order dibatalkan oleh user. Dana dikembalikan ke saldo digital.', req.user.id);

    // Kembalikan dana ke saldo digital user
    const refundAmount = parseInt(order.price || 75000);
    await creditWallet(
      client, req.user.id, refundAmount,
      'order_refund', id,
      `Refund survei kost "${order.kost_name}"`
    );

    await client.query('COMMIT');

    await notify(req.user.id, 'refunded', 'Dana dikembalikan ke saldo',
      `Order "${order.kost_name}" dibatalkan. Dana Rp ${refundAmount.toLocaleString('id-ID')} masuk ke saldo digital.`, id, 'survey');

    res.json({ order: updated.rows[0], refund_amount: refundAmount });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─── agent actions ───────────────────────────────────────────────────────────

async function getAvailableOrders(req, res) {
  const agentRow = await pool.query('SELECT kota, is_available FROM users WHERE id=$1', [req.user.id]);
  const agentKota = agentRow.rows[0]?.kota;
  const isAvailable = agentRow.rows[0]?.is_available;

  if (!agentKota) return res.json({ orders: [], noKota: true });
  if (!isAvailable) return res.json({ orders: [], offline: true });

  // Both sides use standardized dropdown values — simple case-insensitive match
  const result = await pool.query(
    `SELECT so.*, u.name AS user_name, u.phone AS user_phone
     FROM survey_orders so
     JOIN users u ON u.id = so.user_id
     WHERE so.status = 'finding_agent'
       AND LOWER(TRIM(so.kota)) = LOWER(TRIM($1))
     ORDER BY so.created_at DESC`,
    [agentKota]
  );
  res.json({ orders: result.rows });
}

async function getAgentOrders(req, res) {
  const result = await pool.query(
    `SELECT so.*, u.name AS user_name, u.phone AS user_phone
     FROM survey_orders so
     JOIN users u ON u.id = so.user_id
     WHERE so.agent_id = $1
     ORDER BY so.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: result.rows });
}

async function acceptOrder(req, res) {
  const { id } = req.params;
  const agentCheck = await pool.query('SELECT is_available FROM users WHERE id=$1', [req.user.id]);
  if (!agentCheck.rows[0]?.is_available) {
    return res.status(400).json({ error: 'Anda sedang Inactive. Set status Available untuk menerima order.' });
  }
  const activeJob = await pool.query(
    "SELECT id FROM survey_orders WHERE agent_id=$1 AND status='assigned'",
    [req.user.id]
  );
  if (activeJob.rows.length > 0) {
    return res.status(400).json({ error: 'Anda sedang bertugas. Selesaikan order aktif terlebih dahulu sebelum menerima order baru.' });
  }
  // Atomic update: only succeeds if still finding_agent
  const updated = await pool.query(
    `UPDATE survey_orders
     SET agent_id=$1, status='assigned', updated_at=CURRENT_TIMESTAMP
     WHERE id=$2 AND status='finding_agent'
     RETURNING *`,
    [req.user.id, id]
  );
  if (!updated.rows.length) {
    return res.status(400).json({ error: 'Order sudah tidak tersedia atau sudah diterima agent lain' });
  }
  await addHistory(id, 'assigned', `Order diterima oleh agent ${req.user.name}`, req.user.id);
  await notify(updated.rows[0].user_id, 'order_assigned', 'Agent ditemukan!',
    `Agent ${req.user.name} telah menerima order survei "${updated.rows[0].kost_name}".`, id, 'survey');
  res.json({ order: updated.rows[0] });
}

async function submitSurveyResult(req, res) {
  const { id } = req.params;
  const { notes } = req.body;

  if (!notes || !notes.trim()) return res.status(400).json({ error: 'Catatan hasil survei wajib diisi' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Minimal 1 foto wajib diunggah' });

  const check = await pool.query('SELECT * FROM survey_orders WHERE id=$1', [id]);
  if (!check.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
  const order = check.rows[0];

  if (order.agent_id !== req.user.id) return res.status(403).json({ error: 'Hanya agent yang ditugaskan yang dapat mengirim hasil' });
  if (order.status !== 'assigned') return res.status(400).json({ error: 'Order bukan dalam status assigned' });

  const srRow = await pool.query(
    'INSERT INTO survey_results (order_id, agent_id, notes) VALUES ($1,$2,$3) RETURNING id',
    [id, req.user.id, notes.trim()]
  );
  const resultId = srRow.rows[0].id;

  for (const file of req.files) {
    await pool.query(
      'INSERT INTO survey_result_photos (result_id, photo_url) VALUES ($1,$2)',
      [resultId, `/uploads/${file.filename}`]
    );
  }

  await pool.query(
    `UPDATE survey_orders SET status='result_submitted', updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
    [id]
  );
  await addHistory(id, 'result_submitted', 'Hasil survei dikirim oleh agent.', req.user.id);
  await notify(order.user_id, 'survey_result_ready', 'Hasil survei tersedia!',
    `Hasil survei kost "${order.kost_name}" telah dikirim. Silakan cek hasilnya dan pilih langkah selanjutnya.`, id, 'survey');
  res.json({ success: true });
}

/**
 * POST /survey-orders/:id/finalize
 * User memutuskan: complete (tutup order) atau proceed_moving (lanjut ke pindahan)
 * Kedua-duanya menutup status survey ke 'completed'.
 */
async function finalizeOrder(req, res) {
  const { id } = req.params;
  const { action } = req.body;

  if (!['complete','proceed_moving'].includes(action)) {
    return res.status(400).json({ error: 'Action harus complete atau proceed_moving' });
  }

  const found = await pool.query('SELECT * FROM survey_orders WHERE id = $1', [id]);
  if (!found.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = found.rows[0];
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (order.status !== 'result_submitted') {
    return res.status(400).json({ error: 'Order tidak dalam status menunggu keputusan' });
  }

  const updated = await pool.query(
    `UPDATE survey_orders SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
    [id]
  );
  const note = action === 'proceed_moving'
    ? 'User puas dengan hasil survei, lanjut ke order pindahan.'
    : 'User menutup order.';
  await addHistory(id, 'completed', note, req.user.id);

  // Beri tahu agent bahwa order sudah ditutup user
  if (order.agent_id) {
    const title = action === 'proceed_moving'
      ? 'User lanjut ke pindahan'
      : 'Order survei ditutup';
    const body = action === 'proceed_moving'
      ? `User puas dengan hasil survei "${order.kost_name}" dan akan memesan layanan pindahan.`
      : `User menutup order survei "${order.kost_name}".`;
    await notify(order.agent_id, 'survey_finalized', title, body, id, 'survey');
  }

  res.json({ order: updated.rows[0], action });
}

// ─── shared ──────────────────────────────────────────────────────────────────

async function getOrderById(req, res) {
  const { id } = req.params;
  const orderResult = await pool.query(
    `SELECT so.*,
       owner.name AS user_name, owner.phone AS user_phone,
       ag.name AS agent_name, ag.phone AS agent_phone
     FROM survey_orders so
     JOIN users owner ON owner.id = so.user_id
     LEFT JOIN users ag ON ag.id = so.agent_id
     WHERE so.id = $1`,
    [id]
  );
  if (!orderResult.rows.length) return res.status(404).json({ error: 'Order tidak ditemukan' });
  const order = orderResult.rows[0];

  const canView =
    order.user_id === req.user.id ||
    order.agent_id === req.user.id ||
    (req.user.role === 'agent' && order.status === 'finding_agent');
  if (!canView) return res.status(403).json({ error: 'Akses ditolak' });

  const history = await pool.query(
    `SELECT osh.*, u.name AS changed_by_name
     FROM order_status_history osh
     JOIN users u ON u.id = osh.changed_by
     WHERE osh.order_id = $1 ORDER BY osh.created_at`,
    [id]
  );

  let surveyResult = null;
  if (['result_submitted', 'completed'].includes(order.status)) {
    const sr = await pool.query(
      'SELECT * FROM survey_results WHERE order_id=$1',
      [id]
    );
    if (sr.rows.length) {
      surveyResult = sr.rows[0];
      const photos = await pool.query(
        'SELECT * FROM survey_result_photos WHERE result_id=$1 ORDER BY created_at',
        [surveyResult.id]
      );
      surveyResult.photos = photos.rows;
    }
  }

  res.json({ order, history: history.rows, surveyResult });
}

async function getAgentCommissions(req, res) {
  const result = await pool.query(
    `SELECT id, kost_name, price, created_at
     FROM survey_orders
     WHERE agent_id = $1 AND status = 'completed'
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  const list = result.rows.map((row) => ({
    id: row.id,
    orderId: row.id,
    date: row.created_at,
    status: 'Paid',
    amount: row.price,
  }));

  res.json({ list });
}

module.exports = {
  createOrder, getUserOrders, payOrder, requestRefund,
  getAvailableOrders, getAgentOrders, acceptOrder, submitSurveyResult,
  finalizeOrder,
  getOrderById, getAgentCommissions,
};
