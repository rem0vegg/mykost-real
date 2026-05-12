const bcrypt = require('bcryptjs');
const Joi = require('joi');
const pool = require('../db/pool');

const updateSchema = Joi.object({
  name: Joi.string().min(2),
  phone: Joi.string().allow('', null),
  location: Joi.string().allow('', null),
  kota: Joi.string().allow('', null),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

async function getProfile(req, res) {
  const result = await pool.query(
    'SELECT id, email, role, name, phone, kota, location, avatar_url, is_available, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ user: result.rows[0] });
}

async function updateProfile(req, res) {
  const { error, value } = updateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const fields = [];
  const params = [];
  let i = 1;

  if (value.name !== undefined)     { fields.push(`name = $${i++}`);     params.push(value.name); }
  if (value.phone !== undefined)    { fields.push(`phone = $${i++}`);    params.push(value.phone); }
  if (value.location !== undefined) { fields.push(`location = $${i++}`); params.push(value.location); }
  if (value.kota !== undefined)     { fields.push(`kota = $${i++}`);     params.push(value.kota); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.user.id);

  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
     RETURNING id, email, role, name, phone, kota, location, avatar_url`,
    params
  );
  res.json({ user: result.rows[0] });
}

async function changePassword(req, res) {
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(value.currentPassword, result.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Password saat ini salah' });

  const newHash = await bcrypt.hash(value.newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2',
    [newHash, req.user.id]
  );
  res.json({ success: true });
}

async function setAvailability(req, res) {
  const role = req.user.role;
  if (role !== 'agent' && role !== 'mover') {
    return res.status(403).json({ error: 'Hanya agent atau mover yang dapat mengubah ketersediaan' });
  }

  const { is_available } = req.body;
  if (typeof is_available !== 'boolean') return res.status(400).json({ error: 'is_available harus boolean' });

  if (!is_available) {
    if (role === 'agent') {
      const running = await pool.query(
        "SELECT id FROM survey_orders WHERE agent_id=$1 AND status='assigned'",
        [req.user.id]
      );
      if (running.rows.length > 0) {
        return res.status(400).json({
          error: 'Tidak bisa Inactive saat masih ada order survei yang sedang berjalan. Selesaikan order terlebih dahulu.'
        });
      }
    } else {
      const running = await pool.query(
        "SELECT id FROM moving_orders WHERE mover_id=$1 AND status IN ('ACCEPTED','ON_GOING')",
        [req.user.id]
      );
      if (running.rows.length > 0) {
        return res.status(400).json({
          error: 'Tidak bisa Inactive saat masih ada order pindahan yang sedang berjalan. Selesaikan order terlebih dahulu.'
        });
      }
    }
  }

  await pool.query('UPDATE users SET is_available=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [is_available, req.user.id]);
  res.json({ is_available });
}

module.exports = { getProfile, updateProfile, changePassword, setAvailability };
