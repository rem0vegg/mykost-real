const pool = require('../db/pool');
const crypto = require('crypto');

/**
 * Midtrans Snap integration.
 * Menggunakan fetch bawaan Node 18+ untuk memanggil Midtrans Snap API.
 */

function midtransHeaders() {
  const key = process.env.MIDTRANS_SERVER_KEY || '';
  const encoded = Buffer.from(key + ':').toString('base64');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${encoded}`,
  };
}

function snapBaseUrl() {
  const isProduction = process.env.MIDTRANS_ENV === 'production';
  return isProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';
}

/**
 * POST /api/payments/survey/:orderId/snap-token
 * Buat Midtrans Snap token untuk survey order.
 */
async function createSurveySnapToken(req, res) {
  const { orderId } = req.params;

  const orderR = await pool.query(
    `SELECT so.*, u.name as user_name, u.email as user_email, u.phone as user_phone
     FROM survey_orders so
     JOIN users u ON u.id = so.user_id
     WHERE so.id = $1 AND so.user_id = $2`,
    [orderId, req.user.id]
  );
  if (orderR.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = orderR.rows[0];
  if (order.payment_status === 'paid') {
    return res.status(400).json({ error: 'Order sudah dibayar' });
  }
  if (order.status !== 'pending_payment') {
    return res.status(400).json({ error: 'Status order tidak valid untuk pembayaran' });
  }

  const orderRef = `survey-${orderId}`;
  const amount   = parseInt(order.price || 75000);

  // Cek apakah sudah ada snap token aktif
  const existing = await pool.query(
    `SELECT snap_token, snap_redirect FROM midtrans_payments WHERE order_ref = $1 AND status = 'pending'`,
    [orderRef]
  );
  if (existing.rows.length > 0 && existing.rows[0].snap_token) {
    return res.json({
      snap_token:    existing.rows[0].snap_token,
      redirect_url:  existing.rows[0].snap_redirect,
      order_ref:     orderRef,
    });
  }

  const payload = {
    transaction_details: {
      order_id:     orderRef,
      gross_amount: amount,
    },
    customer_details: {
      first_name: order.user_name,
      email:      order.user_email,
      phone:      order.user_phone,
    },
    item_details: [{
      id:       'survey-service',
      price:    amount,
      quantity: 1,
      name:     `Survei Kost - ${order.kost_name}`,
    }],
  };

  try {
    const snapResp = await fetch(`${snapBaseUrl()}/transactions`, {
      method:  'POST',
      headers: midtransHeaders(),
      body:    JSON.stringify(payload),
    });
    const snapData = await snapResp.json();

    if (!snapResp.ok || !snapData.token) {
      console.error('[midtrans] snap error:', snapData);
      return res.status(502).json({ error: 'Gagal membuat sesi pembayaran. Coba lagi.' });
    }

    await pool.query(
      `INSERT INTO midtrans_payments (order_ref, order_id, order_type, user_id, amount, snap_token, snap_redirect)
       VALUES ($1,$2,'survey',$3,$4,$5,$6)
       ON CONFLICT (order_ref) DO UPDATE SET
         snap_token    = EXCLUDED.snap_token,
         snap_redirect = EXCLUDED.snap_redirect,
         status        = 'pending',
         updated_at    = NOW()`,
      [orderRef, orderId, req.user.id, amount, snapData.token, snapData.redirect_url]
    );

    res.json({
      snap_token:   snapData.token,
      redirect_url: snapData.redirect_url,
      order_ref:    orderRef,
    });
  } catch (err) {
    console.error('[midtrans] fetch error:', err);
    res.status(502).json({ error: 'Tidak dapat menghubungi gateway pembayaran' });
  }
}

/**
 * POST /api/payments/moving/:orderId/snap-token
 * Buat Midtrans Snap token untuk moving order.
 */
async function createMovingSnapToken(req, res) {
  const { orderId } = req.params;

  const orderR = await pool.query(
    `SELECT mo.*, u.name as user_name, u.email as user_email, u.phone as user_phone
     FROM moving_orders mo
     JOIN users u ON u.id = mo.user_id
     WHERE mo.id = $1 AND mo.user_id = $2`,
    [orderId, req.user.id]
  );
  if (orderR.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = orderR.rows[0];
  if (order.payment_status === 'paid') {
    return res.status(400).json({ error: 'Order sudah dibayar' });
  }
  if (!['PENDING_PAYMENT', 'REVIEW_REQUIRED'].includes(order.status)) {
    return res.status(400).json({ error: 'Status order tidak valid untuk pembayaran' });
  }

  const orderRef = `moving-${orderId}`;
  const amount   = parseInt(order.estimated_price || order.final_price || 0);

  if (amount <= 0) return res.status(400).json({ error: 'Harga order tidak valid' });

  const existing = await pool.query(
    `SELECT snap_token, snap_redirect FROM midtrans_payments WHERE order_ref = $1 AND status = 'pending'`,
    [orderRef]
  );
  if (existing.rows.length > 0 && existing.rows[0].snap_token) {
    return res.json({
      snap_token:   existing.rows[0].snap_token,
      redirect_url: existing.rows[0].snap_redirect,
      order_ref:    orderRef,
    });
  }

  const vehicleLabel = { MOTORCYCLE: 'Motor', VAN: 'Van', PICKUP_BOX: 'Pickup Box' }[order.vehicle_type] || order.vehicle_type;
  const payload = {
    transaction_details: {
      order_id:     orderRef,
      gross_amount: amount,
    },
    customer_details: {
      first_name: order.user_name,
      email:      order.user_email,
      phone:      order.user_phone,
    },
    item_details: [{
      id:       'moving-service',
      price:    amount,
      quantity: 1,
      name:     `Pindahan ${vehicleLabel} - ${(order.distance_km || 0)} km`,
    }],
  };

  try {
    const snapResp = await fetch(`${snapBaseUrl()}/transactions`, {
      method:  'POST',
      headers: midtransHeaders(),
      body:    JSON.stringify(payload),
    });
    const snapData = await snapResp.json();

    if (!snapResp.ok || !snapData.token) {
      console.error('[midtrans] snap error:', snapData);
      return res.status(502).json({ error: 'Gagal membuat sesi pembayaran. Coba lagi.' });
    }

    await pool.query(
      `INSERT INTO midtrans_payments (order_ref, order_id, order_type, user_id, amount, snap_token, snap_redirect)
       VALUES ($1,$2,'moving',$3,$4,$5,$6)
       ON CONFLICT (order_ref) DO UPDATE SET
         snap_token    = EXCLUDED.snap_token,
         snap_redirect = EXCLUDED.snap_redirect,
         status        = 'pending',
         updated_at    = NOW()`,
      [orderRef, orderId, req.user.id, amount, snapData.token, snapData.redirect_url]
    );

    res.json({
      snap_token:   snapData.token,
      redirect_url: snapData.redirect_url,
      order_ref:    orderRef,
    });
  } catch (err) {
    console.error('[midtrans] fetch error:', err);
    res.status(502).json({ error: 'Tidak dapat menghubungi gateway pembayaran' });
  }
}

/**
 * POST /api/payments/webhook
 * Midtrans HTTP Notification (webhook).
 */
async function handleWebhook(req, res) {
  const notification = req.body;

  // Verifikasi signature key
  const serverKey   = process.env.MIDTRANS_SERVER_KEY || '';
  const rawSig      = notification.order_id + notification.status_code + notification.gross_amount + serverKey;
  const expectedSig = crypto.createHash('sha512').update(rawSig).digest('hex');

  if (notification.signature_key !== expectedSig) {
    console.warn('[midtrans webhook] invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const orderRef        = notification.order_id;       // e.g. "survey-<uuid>"
  const transactionStatus = notification.transaction_status;
  const fraudStatus       = notification.fraud_status;

  const isPaid = transactionStatus === 'capture' && fraudStatus === 'accept'
              || transactionStatus === 'settlement';
  const isDenied  = transactionStatus === 'deny';
  const isExpired = transactionStatus === 'expire';
  const isCancelled = transactionStatus === 'cancel';

  const mtR = await pool.query(
    `SELECT * FROM midtrans_payments WHERE order_ref = $1`,
    [orderRef]
  );
  if (mtR.rows.length === 0) return res.status(404).json({ error: 'Payment record not found' });

  const mt = mtR.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update midtrans_payments
    const newStatus = isPaid ? 'paid' : isDenied || isCancelled ? 'cancelled' : isExpired ? 'expired' : 'failed';
    await client.query(
      `UPDATE midtrans_payments SET status = $1, midtrans_txn = $2, updated_at = NOW()
       WHERE order_ref = $3`,
      [newStatus, JSON.stringify(notification), orderRef]
    );

    if (isPaid) {
      if (mt.order_type === 'survey') {
        await client.query(
          `UPDATE survey_orders SET payment_status = 'paid', status = 'finding_agent', updated_at = NOW()
           WHERE id = $1 AND payment_status = 'pending'`,
          [mt.order_id]
        );
      } else if (mt.order_type === 'moving') {
        await client.query(
          `UPDATE moving_orders
           SET payment_status = 'paid',
               status = CASE WHEN requires_review THEN 'REVIEW_REQUIRED' ELSE 'INSTANT_CONFIRMED' END,
               updated_at = NOW()
           WHERE id = $1 AND payment_status = 'pending'`,
          [mt.order_id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ status: 'ok' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[midtrans webhook] error:', e);
    res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
}

module.exports = { createSurveySnapToken, createMovingSnapToken, handleWebhook };
