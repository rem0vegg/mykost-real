const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movingOrderController');
const { authenticate, requireRole } = require('../middleware/auth');

// User routes
router.post('/', authenticate, requireRole('user'), ctrl.createOrder);
router.get('/', authenticate, requireRole('user'), ctrl.getUserOrders);

// Mover routes
router.get('/available', authenticate, requireRole('mover'), ctrl.getAvailableOrders);
router.get('/my-jobs', authenticate, requireRole('mover'), ctrl.getMoverOrders);
router.post('/:id/accept', authenticate, requireRole('mover'), ctrl.acceptOrder);
router.put('/:id/status', authenticate, requireRole('mover'), ctrl.updateOrderStatus);

// Shared
router.get('/:id', authenticate, ctrl.getOrderById);

module.exports = router;
