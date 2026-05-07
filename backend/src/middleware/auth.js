const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Map legacy role → capability
const LEGACY_ROLE_TO_CAP = {
  user:  'customer',
  agent: 'surveyor',
  mover: 'mover',
};

/**
 * requireRole('user'|'agent'|'mover', ...)
 * Backward-compatible: dipenuhi kalau JWT-role match (legacy) ATAU user
 * memiliki capability setara di tabel user_capabilities (status = 'active').
 */
function requireRole(...roles) {
  return async (req, res, next) => {
    // Fast path: legacy role check
    if (roles.includes(req.user.role)) return next();

    // Capability check (universal account)
    const wanted = roles.map(r => LEGACY_ROLE_TO_CAP[r]).filter(Boolean);
    if (wanted.length === 0) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    try {
      const r = await pool.query(
        `SELECT 1 FROM user_capabilities
         WHERE user_id = $1 AND capability = ANY($2) AND status = 'active' LIMIT 1`,
        [req.user.id, wanted]
      );
      if (r.rows.length > 0) return next();
    } catch (e) {
      console.error('capability check failed:', e.message);
    }
    return res.status(403).json({ error: 'Akses ditolak — capability dibutuhkan' });
  };
}

module.exports = { authenticate, requireRole };
