const Joi  = require('joi');
const pool = require('../db/pool');
const {
  calculatePrice,
  determineRequiresReview,
  getPriceRange,
  getVehicleWarning,
  getRecommendedUpgrade,
  VEHICLE_CONFIG,
} = require('../utils/movingPricing');

// ─── Validation schemas ────────────────────────────────────────────────────────

const estimateSchema = Joi.object({
  distance_km:    Joi.number().positive().required(),
  vehicle_type:   Joi.string().valid('MOTORCYCLE','VAN','PICKUP_BOX').required(),
  move_type:      Joi.string().valid('RINGAN','SEDANG','BERAT').required(),
  pickup_floor:   Joi.number().integer().min(1).default(1),
  dropoff_floor:  Joi.number().integer().min(1).default(1),
  has_lift:       Joi.boolean().default(false),
  has_large_items:Joi.boolean().default(false),
  is_round_trip:  Joi.boolean().default(false),
  is_door_to_door:Joi.boolean().default(false),
});

const createSchema = Joi.object({
  // Lokasi
  pickup_location:    Joi.string().required(),
  pickup_latitude:    Joi.number().allow(null),
  pickup_longitude:   Joi.number().allow(null),
  dropoff_location:   Joi.string().required(),
  dropoff_latitude:   Joi.number().allow(null),
  dropoff_longitude:  Joi.number().allow(null),
  distance_km:        Joi.number().positive().required(),

  // Tipe & kendaraan
  move_type:          Joi.string().valid('RINGAN','SEDANG','BERAT').required(),
  vehicle_type:       Joi.string().valid('MOTORCYCLE','VAN','PICKUP_BOX').required(),
  vehicle_mismatch_warned: Joi.boolean().default(false),

  // Info tambahan
  pickup_floor:       Joi.number().integer().min(1).default(1),
  dropoff_floor:      Joi.number().integer().min(1).default(1),
  has_lift:           Joi.boolean().default(false),
  notes:              Joi.string().allow('', null),

  // Barang
  has_large_items:    Joi.boolean().default(false),

  // Add-ons
  is_round_trip:      Joi.boolean().default(false),
  is_door_to_door:    Joi.boolean().default(false),

  scheduled_date:     Joi.date().iso().greater('now').allow(null),
});

const reportSchema = Joi.object({
  reason:   Joi.string().valid('OVER_CAPACITY','BARANG_TIDAK_SESUAI','TIDAK_AMAN').required(),
  notes:    Joi.string().allow('', null),
});

const rebookSchema = Joi.object({
  vehicle_type:   Joi.string().valid('MOTORCYCLE','VAN','PICKUP_BOX').required(),
  scheduled_date: Joi.date().iso().greater('now').allow(null),
  notes:          Joi.string().allow('', null),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function insertHistory(client, { order_id, from_status, to_status, note, changed_by }) {
  await client.query(
    `INSERT INTO moving_order_status_history
       (order_id, from_status, to_status, note, changed_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [order_id, from_status || null, to_status, note || null, changed_by]
  );
}

function buildPricing(value) {
  const { base_price, surcharge, addon_price, estimated_price } = calculatePrice(value);
  const requires_review = determineRequiresReview({
    move_type:       value.move_type,
    has_large_items: value.has_large_items,
    photo_count:     0,
  });

  const priceRange = requires_review ? getPriceRange(estimated_price) : {};
  return { base_price, surcharge, addon_price, estimated_price, requires_review, ...priceRange };
}

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /moving-orders/estimate
 * Tidak perlu auth. Instan, tanpa menyimpan ke DB.
 */
async function estimatePrice(req, res) {
  const { error, value } = estimateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const pricing         = buildPricing(value);
  const vehicle_warning = getVehicleWarning(value);

  res.json({
    ...pricing,
    bookable_status: pricing.requires_review ? 'REVIEW_REQUIRED' : 'INSTANT_BOOKABLE',
    vehicle_warning,
    vehicle_info: VEHICLE_CONFIG[value.vehicle_type],
  });
}

/**
 * POST /moving-orders
 * User membuat order baru.
 * - Hitung harga otomatis
 * - Tipe BERAT wajib upload foto (cek di endpoint photos)
 * - Status langsung INSTANT_CONFIRMED atau REVIEW_REQUIRED
 */
async function createOrder(req, res) {
  const { error, value } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const pricing         = buildPricing(value);
  const vehicle_warning = getVehicleWarning(value);

  // Tipe BERAT wajib upload foto sebelum SUBMITTED.
  // Di sini kita tetap izinkan create dengan status DRAFT,
  // foto bisa diupload setelah ini via POST /:id/photos.
  const initialStatus = pricing.requires_review ? 'REVIEW_REQUIRED' : 'INSTANT_CONFIRMED';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO moving_orders (
         user_id, pickup_location, pickup_latitude, pickup_longitude,
         dropoff_location, dropoff_latitude, dropoff_longitude, distance_km,
         move_type, vehicle_type, vehicle_mismatch_warned,
         pickup_floor, dropoff_floor, has_lift, notes,
         has_large_items, is_round_trip, is_door_to_door,
         base_price, surcharge, addon_price, estimated_price,
         price_min, price_max, requires_review, status, scheduled_date
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
       ) RETURNING *`,
      [
        req.user.id,
        value.pickup_location, value.pickup_latitude || null, value.pickup_longitude || null,
        value.dropoff_location, value.dropoff_latitude || null, value.dropoff_longitude || null,
        value.distance_km,
        value.move_type, value.vehicle_type, value.vehicle_mismatch_warned,
        value.pickup_floor, value.dropoff_floor, value.has_lift, value.notes || null,
        value.has_large_items, value.is_round_trip, value.is_door_to_door,
        pricing.base_price, pricing.surcharge, pricing.addon_price, pricing.estimated_price,
        pricing.price_min || null, pricing.price_max || null,
        pricing.requires_review,
        initialStatus,
        value.scheduled_date || null,
      ]
    );

    const order = result.rows[0];
    await insertHistory(client, {
      order_id:    order.id,
      from_status: null,
      to_status:   initialStatus,
      note:        'Order dibuat',
      changed_by:  req.user.id,
    });

    await client.query('COMMIT');
    res.status(201).json({ order, vehicle_warning });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * POST /moving-orders/:id/photos
 * User upload foto barang. Wajib untuk tipe BERAT sebelum order aktif.
 * Menggunakan multer (array field 'photos', max 5 file).
 */
async function uploadPhotos(req, res) {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM moving_orders WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = result.rows[0];
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (['COMPLETED','CANCELLED','INVALID'].includes(order.status)) {
    return res.status(400).json({ error: 'Order sudah final, tidak bisa upload foto' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Tidak ada file yang diupload' });
  }

  const newUrls   = req.files.map(f => `/uploads/${f.filename}`);
  const allUrls   = [...(order.photo_urls || []), ...newUrls];

  // Setelah ada foto, cek ulang apakah requires_review berubah
  const requires_review = determineRequiresReview({
    move_type:       order.move_type,
    has_large_items: order.has_large_items,
    photo_count:     allUrls.length,
  });

  let priceMin = order.price_min;
  let priceMax = order.price_max;
  if (requires_review && !order.price_min) {
    ({ price_min: priceMin, price_max: priceMax } = getPriceRange(order.estimated_price));
  }

  const updated = await pool.query(
    `UPDATE moving_orders
     SET photo_urls = $1, requires_review = $2, price_min = $3, price_max = $4,
         status = CASE
           WHEN status = 'INSTANT_CONFIRMED' AND $2 THEN 'REVIEW_REQUIRED'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [allUrls, requires_review, priceMin, priceMax, id]
  );

  res.json({ order: updated.rows[0] });
}

/**
 * GET /moving-orders
 * Daftar order milik user yang login.
 */
async function getUserOrders(req, res) {
  const result = await pool.query(
    `SELECT mo.*,
       mv.name  AS mover_name,
       mv.phone AS mover_phone
     FROM moving_orders mo
     LEFT JOIN users mv ON mv.id = mo.mover_id
     WHERE mo.user_id = $1
     ORDER BY mo.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: result.rows });
}

/**
 * GET /moving-orders/:id
 * Detail order + history status. Bisa diakses user pemilik atau mover yang assign.
 */
async function getOrderById(req, res) {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT mo.*,
       owner.name  AS user_name,  owner.phone AS user_phone,
       mv.name     AS mover_name, mv.phone    AS mover_phone
     FROM moving_orders mo
     JOIN  users owner ON owner.id = mo.user_id
     LEFT JOIN users mv ON mv.id = mo.mover_id
     WHERE mo.id = $1`,
    [id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = result.rows[0];
  if (order.user_id !== req.user.id && order.mover_id !== req.user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  const [history, reports] = await Promise.all([
    pool.query(
      `SELECT mosh.*, u.name AS changed_by_name
       FROM moving_order_status_history mosh
       JOIN users u ON u.id = mosh.changed_by
       WHERE mosh.order_id = $1
       ORDER BY mosh.created_at ASC`,
      [id]
    ),
    pool.query(
      'SELECT * FROM driver_reports WHERE order_id = $1 ORDER BY created_at DESC',
      [id]
    ),
  ]);

  res.json({ order, history: history.rows, driver_reports: reports.rows });
}

/**
 * GET /moving-orders/available  (mover)
 * Order yang bisa diambil: hanya INSTANT_CONFIRMED.
 * REVIEW_REQUIRED hanya bisa diambil setelah admin approve → jadi INSTANT_CONFIRMED.
 */
async function getAvailableOrders(req, res) {
  const result = await pool.query(
    `SELECT mo.*, u.name AS user_name, u.phone AS user_phone
     FROM moving_orders mo
     JOIN users u ON u.id = mo.user_id
     WHERE mo.status = 'INSTANT_CONFIRMED'
       AND mo.mover_id IS NULL
     ORDER BY mo.created_at ASC`
  );
  res.json({ orders: result.rows });
}

/**
 * GET /moving-orders/my-jobs  (mover)
 */
async function getMoverOrders(req, res) {
  const result = await pool.query(
    `SELECT mo.*, u.name AS user_name, u.phone AS user_phone
     FROM moving_orders mo
     JOIN users u ON u.id = mo.user_id
     WHERE mo.mover_id = $1
     ORDER BY mo.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: result.rows });
}

/**
 * POST /moving-orders/:id/accept  (mover)
 * Atomic: hanya berhasil jika status masih INSTANT_CONFIRMED dan belum ada mover.
 */
async function acceptOrder(req, res) {
  const { id } = req.params;

  const updated = await pool.query(
    `UPDATE moving_orders
     SET mover_id = $1, status = 'ACCEPTED', updated_at = NOW()
     WHERE id = $2
       AND status = 'INSTANT_CONFIRMED'
       AND mover_id IS NULL
     RETURNING *`,
    [req.user.id, id]
  );

  if (updated.rows.length === 0) {
    const exists = await pool.query('SELECT id, status FROM moving_orders WHERE id = $1', [id]);
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
    return res.status(409).json({ error: 'Order sudah tidak tersedia', current_status: exists.rows[0].status });
  }

  const order = updated.rows[0];
  await pool.query(
    `INSERT INTO moving_order_status_history (order_id, from_status, to_status, note, changed_by)
     VALUES ($1,'INSTANT_CONFIRMED','ACCEPTED',$2,$3)`,
    [id, `Diambil oleh mover ${req.user.name}`, req.user.id]
  );

  res.json({ order });
}

/**
 * PUT /moving-orders/:id/status  (mover)
 * Update status: ACCEPTED → ON_GOING → COMPLETED
 */
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const schema = Joi.object({
    status: Joi.string().valid('ON_GOING','COMPLETED').required(),
    note:   Joi.string().allow('', null),
    final_price: Joi.number().integer().positive().when('status', {
      is: 'COMPLETED', then: Joi.required(),
    }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const found = await pool.query('SELECT * FROM moving_orders WHERE id = $1', [id]);
  if (found.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = found.rows[0];
  if (order.mover_id !== req.user.id) {
    return res.status(403).json({ error: 'Hanya mover yang assign yang bisa update status' });
  }

  // Validasi transisi status yang diizinkan
  const allowed = { ACCEPTED: 'ON_GOING', ON_GOING: 'COMPLETED' };
  if (allowed[order.status] !== value.status) {
    return res.status(400).json({
      error: `Transisi tidak valid: ${order.status} → ${value.status}`,
    });
  }

  const updated = await pool.query(
    `UPDATE moving_orders
     SET status = $1,
         final_price = COALESCE($2, final_price),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [value.status, value.final_price || null, id]
  );

  await pool.query(
    `INSERT INTO moving_order_status_history (order_id, from_status, to_status, note, changed_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, order.status, value.status, value.note || null, req.user.id]
  );

  res.json({ order: updated.rows[0] });
}

/**
 * POST /moving-orders/:id/report  (mover)
 * Driver report mismatch di lokasi pickup.
 * - Bisa dilakukan saat status ACCEPTED atau ON_GOING
 * - Driver tidak kena penalti
 * - Order → INVALID
 */
async function reportMismatch(req, res) {
  const { id } = req.params;
  const { error, value } = reportSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  if (!req.file) return res.status(400).json({ error: 'Foto bukti wajib diupload' });

  const found = await pool.query('SELECT * FROM moving_orders WHERE id = $1', [id]);
  if (found.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const order = found.rows[0];
  if (order.mover_id !== req.user.id) {
    return res.status(403).json({ error: 'Hanya mover yang assign yang bisa report' });
  }
  if (!['ACCEPTED','ON_GOING'].includes(order.status)) {
    return res.status(400).json({ error: 'Report hanya bisa dilakukan saat order ACCEPTED atau ON_GOING' });
  }

  const photo_url = `/uploads/${req.file.filename}`;
  const client    = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO driver_reports (order_id, driver_id, reason, photo_url, notes)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, req.user.id, value.reason, photo_url, value.notes || null]
    );

    const updated = await client.query(
      `UPDATE moving_orders
       SET status = 'INVALID', invalid_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [value.reason, id]
    );

    await insertHistory(client, {
      order_id:    id,
      from_status: order.status,
      to_status:   'INVALID',
      note:        `Driver report: ${value.reason}`,
      changed_by:  req.user.id,
    });

    await client.query('COMMIT');

    const recommended_vehicle = getRecommendedUpgrade({
      move_type:       order.move_type,
      has_large_items: order.has_large_items,
      current_vehicle: order.vehicle_type,
    });

    res.json({
      order:      updated.rows[0],
      message:    'Mismatch dilaporkan. Order dibatalkan tanpa penalti.',
      recommended_vehicle,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * POST /moving-orders/:id/rebook  (user)
 * User rebook setelah order INVALID.
 * Sistem clone order lama dengan vehicle baru, hitung ulang harga.
 */
async function rebookOrder(req, res) {
  const { id } = req.params;
  const { error, value } = rebookSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const found = await pool.query('SELECT * FROM moving_orders WHERE id = $1', [id]);
  if (found.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const old = found.rows[0];
  if (old.user_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (old.status !== 'INVALID') {
    return res.status(400).json({ error: 'Rebook hanya bisa untuk order yang INVALID' });
  }

  const newVehicle = value.vehicle_type;
  const pricing    = buildPricing({ ...old, vehicle_type: newVehicle });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO moving_orders (
         user_id, pickup_location, pickup_latitude, pickup_longitude,
         dropoff_location, dropoff_latitude, dropoff_longitude, distance_km,
         move_type, vehicle_type,
         pickup_floor, dropoff_floor, has_lift, notes,
         has_large_items, is_round_trip, is_door_to_door,
         base_price, surcharge, addon_price, estimated_price,
         price_min, price_max, requires_review, status,
         scheduled_date, rebooked_from
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
         $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
       ) RETURNING *`,
      [
        old.user_id,
        old.pickup_location, old.pickup_latitude, old.pickup_longitude,
        old.dropoff_location, old.dropoff_latitude, old.dropoff_longitude,
        old.distance_km,
        old.move_type, newVehicle,
        old.pickup_floor, old.dropoff_floor, old.has_lift,
        value.notes || old.notes,
        old.has_large_items, old.is_round_trip, old.is_door_to_door,
        pricing.base_price, pricing.surcharge, pricing.addon_price, pricing.estimated_price,
        pricing.price_min || null, pricing.price_max || null,
        pricing.requires_review,
        pricing.requires_review ? 'REVIEW_REQUIRED' : 'INSTANT_CONFIRMED',
        value.scheduled_date || null,
        old.id,
      ]
    );

    const newOrder = result.rows[0];
    await insertHistory(client, {
      order_id:    newOrder.id,
      from_status: null,
      to_status:   newOrder.status,
      note:        `Rebook dari order ${old.id} (${old.vehicle_type} → ${newVehicle})`,
      changed_by:  req.user.id,
    });

    await client.query('COMMIT');

    res.status(201).json({
      order:   newOrder,
      message: 'Order baru berhasil dibuat.',
      vehicle_warning: getVehicleWarning({
        move_type:       old.move_type,
        vehicle_type:    newVehicle,
        has_large_items: old.has_large_items,
      }),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * GET /moving-orders/vehicles
 * Daftar kendaraan + tarif (untuk UI step 3).
 */
async function getVehicles(req, res) {
  const result = await pool.query('SELECT * FROM vehicle_types ORDER BY rate_per_km ASC');
  res.json({ vehicles: result.rows });
}

/**
 * PUT /moving-orders/:id/review  (admin — role: agent atau future admin role)
 * Admin approve atau reject order REVIEW_REQUIRED.
 */
async function reviewOrder(req, res) {
  const { id } = req.params;
  const schema = Joi.object({
    action:      Joi.string().valid('APPROVE','REJECT').required(),
    final_price: Joi.number().integer().positive().when('action', {
      is: 'APPROVE', then: Joi.required(),
    }),
    note: Joi.string().allow('', null),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const found = await pool.query('SELECT * FROM moving_orders WHERE id = $1', [id]);
  if (found.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
  if (found.rows[0].status !== 'REVIEW_REQUIRED') {
    return res.status(400).json({ error: 'Hanya order berstatus REVIEW_REQUIRED yang bisa direview' });
  }

  const toStatus  = value.action === 'APPROVE' ? 'INSTANT_CONFIRMED' : 'CANCELLED';
  const updated   = await pool.query(
    `UPDATE moving_orders
     SET status = $1,
         estimated_price = COALESCE($2, estimated_price),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [toStatus, value.final_price || null, id]
  );

  await pool.query(
    `INSERT INTO moving_order_status_history (order_id, from_status, to_status, note, changed_by)
     VALUES ($1,'REVIEW_REQUIRED',$2,$3,$4)`,
    [id, toStatus, value.note || null, req.user.id]
  );

  res.json({ order: updated.rows[0] });
}

module.exports = {
  estimatePrice,
  createOrder,
  uploadPhotos,
  getUserOrders,
  getOrderById,
  getAvailableOrders,
  getMoverOrders,
  acceptOrder,
  updateOrderStatus,
  reportMismatch,
  rebookOrder,
  getVehicles,
  reviewOrder,
};
