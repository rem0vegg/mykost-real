const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { createSurveySnapToken, createMovingSnapToken, handleWebhook } = require('../controllers/paymentController');

// Snap token endpoints (require auth)
router.post('/survey/:orderId/snap-token',  authenticate, createSurveySnapToken);
router.post('/moving/:orderId/snap-token',  authenticate, createMovingSnapToken);

// Midtrans webhook (no auth — validated by signature key)
router.post('/webhook', handleWebhook);

module.exports = router;
