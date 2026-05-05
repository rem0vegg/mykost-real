const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, setAvailability } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.put('/availability', authenticate, setAvailability);

module.exports = router;
