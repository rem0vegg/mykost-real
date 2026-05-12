const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, registerMitra, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
});

router.post('/register',       authLimiter, register);
router.post('/register-mitra', authLimiter, registerMitra);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);
router.post('/logout', (req, res) => res.json({ success: true }));

module.exports = router;
