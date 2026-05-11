const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const pool = require('../db/pool');

// account_type menentukan kapabilitas awal user.
// 'customer' hanya dapat layanan sebagai pengguna biasa — tidak bisa apply mover/surveyor.
// 'mover' / 'surveyor' mendapat kapabilitas sesuai pilihan saat registrasi.
const registerSchema = Joi.object({
  email:        Joi.string().email().required(),
  password:     Joi.string().min(6).required(),
  name:         Joi.string().min(2).max(80).required(),
  phone:        Joi.string().pattern(/^\d+$/).min(10).max(13).required(),
  account_type: Joi.string().valid('customer', 'mover', 'surveyor').default('customer'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function loadCapabilities(userId) {
  const r = await pool.query(
    `SELECT capability, status FROM user_capabilities WHERE user_id = $1`,
    [userId]
  );
  return r.rows;
}

async function register(req, res) {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password, name, phone, account_type } = value;

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email sudah terdaftar' });
  }

  const password_hash = await bcrypt.hash(password, 10);

  // Map account_type ke legacy role
  const legacyRole = account_type === 'mover' ? 'mover'
    : account_type === 'surveyor' ? 'agent'
    : 'user';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, name, phone, account_type)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, email, role, name, phone, kota, is_available, account_type, created_at`,
      [email, password_hash, legacyRole, name, phone, account_type]
    );
    const user = result.rows[0];

    // Setiap akun baru selalu mendapat capability 'customer'
    await client.query(
      `INSERT INTO user_capabilities (user_id, capability, status)
       VALUES ($1, 'customer', 'active')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    // Tambah capability sesuai account_type
    if (account_type === 'mover') {
      await client.query(
        `INSERT INTO user_capabilities (user_id, capability, status)
         VALUES ($1, 'mover', 'active')
         ON CONFLICT DO NOTHING`,
        [user.id]
      );
    } else if (account_type === 'surveyor') {
      await client.query(
        `INSERT INTO user_capabilities (user_id, capability, status)
         VALUES ($1, 'surveyor', 'active')
         ON CONFLICT DO NOTHING`,
        [user.id]
      );
    }

    // Buat wallet untuk user baru
    await client.query(
      `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [user.id]
    );

    await client.query('COMMIT');

    const capabilities = await loadCapabilities(user.id);
    const token = signToken(user);

    // Tentukan redirect setelah registrasi
    let redirect = '/onboarding';
    if (account_type === 'mover')    redirect = '/apply/mover';
    if (account_type === 'surveyor') redirect = '/apply/surveyor';

    res.status(201).json({ user, capabilities, token, needs_onboarding: true, redirect });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function login(req, res) {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password } = value;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email atau password salah' });

  // Pastikan wallet ada
  await pool.query(
    `INSERT INTO user_wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [user.id]
  );

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;
  const capabilities = await loadCapabilities(user.id);
  res.json({ user: safeUser, capabilities, token });
}

async function me(req, res) {
  const result = await pool.query(
    `SELECT id, email, role, name, phone, kota, location, avatar_url,
            is_available, account_type, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const capabilities = await loadCapabilities(req.user.id);
  res.json({ user: result.rows[0], capabilities });
}

module.exports = { register, login, me };
