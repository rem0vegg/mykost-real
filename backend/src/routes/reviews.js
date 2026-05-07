const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('user'), ctrl.createReview);
router.get('/', authenticate, ctrl.listReviews);
router.get('/order/:order_type/:order_id', authenticate, ctrl.getOrderReview);

module.exports = router;
