const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/surveyOrderController');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── user ─────────────────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('user'), upload.array('attachment', 5), ctrl.createOrder);
router.get('/', authenticate, requireRole('user'), ctrl.getUserOrders);
router.post('/:id/pay', authenticate, requireRole('user'), ctrl.payOrder);
router.post('/:id/refund', authenticate, requireRole('user'), ctrl.requestRefund);

// ── agent ─────────────────────────────────────────────────────────────────────
// NOTE: /available and /my-orders must come BEFORE /:id
router.get('/available', authenticate, requireRole('agent'), ctrl.getAvailableOrders);
router.get('/my-orders', authenticate, requireRole('agent'), ctrl.getAgentOrders);
router.post('/:id/accept', authenticate, requireRole('agent'), ctrl.acceptOrder);
router.post('/:id/survey-result',
  authenticate, requireRole('agent'),
  upload.array('photos', 10),
  ctrl.submitSurveyResult
);

// ── shared ────────────────────────────────────────────────────────────────────
router.get('/:id', authenticate, ctrl.getOrderById);

module.exports = router;
