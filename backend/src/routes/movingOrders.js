const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/movingOrderController');
const upload  = require('../middleware/upload');
const { authenticate, requireRole } = require('../middleware/auth');

// ── Public / estimate ─────────────────────────────────────────────────────────
// Tidak perlu auth — bisa dipanggil dari halaman pricing sebelum login
router.post('/estimate', ctrl.estimatePrice);
router.get('/vehicles',  ctrl.getVehicles);

// ── User routes ───────────────────────────────────────────────────────────────
router.post('/',
  authenticate, requireRole('user'),
  ctrl.createOrder
);

router.get('/',
  authenticate, requireRole('user'),
  ctrl.getUserOrders
);

router.post('/:id/photos',
  authenticate, requireRole('user'),
  upload.array('photos', 5),
  ctrl.uploadPhotos
);

router.post('/:id/rebook',
  authenticate, requireRole('user'),
  ctrl.rebookOrder
);

router.post('/:id/pay',
  authenticate, requireRole('user'),
  ctrl.payOrder
);

router.post('/:id/cancel',
  authenticate, requireRole('user'),
  ctrl.cancelOrder
);

// ── Mover routes ──────────────────────────────────────────────────────────────
router.get('/available',
  authenticate, requireRole('mover'),
  ctrl.getAvailableOrders
);

router.get('/my-jobs',
  authenticate, requireRole('mover'),
  ctrl.getMoverOrders
);

router.post('/:id/accept',
  authenticate, requireRole('mover'),
  ctrl.acceptOrder
);

router.put('/:id/status',
  authenticate, requireRole('mover'),
  ctrl.updateOrderStatus
);

// Driver wajib upload 1 foto bukti mismatch
router.post('/:id/report',
  authenticate, requireRole('mover'),
  upload.single('photo'),
  ctrl.reportMismatch
);

// ── Admin routes ──────────────────────────────────────────────────────────────
// Agent role digunakan sementara sebagai admin moving (bisa dipisah nanti)
router.put('/:id/review',
  authenticate, requireRole('agent'),
  ctrl.reviewOrder
);

// ── Shared ────────────────────────────────────────────────────────────────────
// Letakkan paling bawah agar tidak overwrite route statis di atas
router.get('/:id',
  authenticate,
  ctrl.getOrderById
);

module.exports = router;
