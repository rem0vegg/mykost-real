const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { createSurveySnapToken, createMovingSnapToken, handleWebhook, verifyPayment } = require('../controllers/paymentController');

// Snap token endpoints (require auth)
router.post('/survey/:orderId/snap-token',  authenticate, createSurveySnapToken);
router.post('/moving/:orderId/snap-token',  authenticate, createMovingSnapToken);

// Verify payment status via Midtrans API (untuk dev/localhost tanpa webhook)
router.post('/survey/:orderId/verify',  authenticate, (req, res) => { req.params.type = 'survey'; verifyPayment(req, res); });
router.post('/moving/:orderId/verify',  authenticate, (req, res) => { req.params.type = 'moving'; verifyPayment(req, res); });

// Midtrans webhook (no auth — validated by signature key)
router.post('/webhook', handleWebhook);

module.exports = router;
