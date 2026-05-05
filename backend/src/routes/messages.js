const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, getUnreadCount } = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.get('/unread', authenticate, getUnreadCount);
router.get('/:orderId', authenticate, getMessages);
router.post('/:orderId', authenticate, sendMessage);

module.exports = router;
