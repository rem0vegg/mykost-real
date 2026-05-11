const Joi = require('joi');
const pool = require('../db/pool');

const VALID_CAPS = ['customer', 'mover', 'surveyor'];

const moverApplySchema = Joi.object({
  vehicle_types: Joi.array().items(Joi.string().valid('MOTORCYCLE','VAN','PICKUP_BOX')).min(1).required(),
  service_area:  Joi.string().max(200).allow('', null),
  bio:           Joi.string().max(500).allow('', null),
});

const surveyorApplySchema = Joi.object({
  kota: Joi.string().min(2).max(100).required(),
  bio:  Joi.string().max(500).allow('', null),
});

async function getAccountType(userId) {
  const r = await pool.query('SELECT account_type FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.account_type || 'customer';
}

/**
 * GET /me/capabilities
 */
async function getMyCapabilities(req, res) {
  const caps = await pool.query(
    `SELECT capability, status, created_at FROM user_capabilities WHERE user_id = $1`,
    [req.user.id]
  );

  const moverProfile = await pool.query(
    `SELECT * FROM mover_profiles WHERE user_id = $1`, [req.user.id]
  );
  const surveyorProfile = await pool.query(
    `SELECT * FROM surveyor_profiles WHERE user_id = $1`, [req.user.id]
  );

  res.json({
    capabilities:     caps.rows,
    mover_profile:    moverProfile.rows[0] || null,
    surveyor_profile: surveyorProfile.rows[0] || null,
  });
}

/**
 * POST /me/capabilities/mover
 * Hanya untuk akun yang mendaftar sebagai 'mover'.
 */
async function applyMover(req, res) {
  const accountType = await getAccountType(req.user.id);
  if (accountType === 'customer') {
    return res.status(403).json({
      error: 'Akun pengguna biasa tidak dapat mendaftar sebagai mover. Buat akun baru dan pilih "Mover" saat registrasi.',
    });
  }

  const { error, value } = moverApplySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO user_capabilities (user_id, capability, status)
       VALUES ($1, 'mover', 'active')
       ON CONFLICT (user_id, capability) DO UPDATE SET status = 'active'`,
      [req.user.id]
    );

    await client.query(
      `INSERT INTO mover_profiles (user_id, vehicle_types, service_area, bio)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         vehicle_types = EXCLUDED.vehicle_types,
         service_area  = EXCLUDED.service_area,
         bio           = EXCLUDED.bio,
         updated_at    = NOW()`,
      [req.user.id, value.vehicle_types, value.service_area || null, value.bio || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, capability: 'mover', status: 'active' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * POST /me/capabilities/surveyor
 * Hanya untuk akun yang mendaftar sebagai 'surveyor'.
 */
async function applySurveyor(req, res) {
  const accountType = await getAccountType(req.user.id);
  if (accountType === 'customer') {
    return res.status(403).json({
      error: 'Akun pengguna biasa tidak dapat mendaftar sebagai surveyor. Buat akun baru dan pilih "Surveyor" saat registrasi.',
    });
  }

  const { error, value } = surveyorApplySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO user_capabilities (user_id, capability, status)
       VALUES ($1, 'surveyor', 'active')
       ON CONFLICT (user_id, capability) DO UPDATE SET status = 'active'`,
      [req.user.id]
    );

    await client.query(
      `INSERT INTO surveyor_profiles (user_id, kota, bio)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         kota       = EXCLUDED.kota,
         bio        = EXCLUDED.bio,
         updated_at = NOW()`,
      [req.user.id, value.kota, value.bio || null]
    );

    await client.query(
      `UPDATE users SET kota = COALESCE(kota, $1) WHERE id = $2`,
      [value.kota, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, capability: 'surveyor', status: 'active' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getMyCapabilities, applyMover, applySurveyor, VALID_CAPS };
