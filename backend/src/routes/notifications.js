const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getNotifications);
router.post('/mark-all-read', authenticate, ctrl.markAllRead);
router.post('/:id/read', authenticate, ctrl.markOneRead);

module.exports = router;
