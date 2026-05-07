const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/complaintController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('user'), ctrl.createComplaint);
router.get('/me', authenticate, requireRole('user'), ctrl.getMyComplaints);
router.get('/order/:order_type/:order_id', authenticate, ctrl.getOrderComplaints);

module.exports = router;
