const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/capabilityController');
const { authenticate } = require('../middleware/auth');

router.get('/',          authenticate, ctrl.getMyCapabilities);
router.post('/mover',    authenticate, ctrl.applyMover);
router.post('/surveyor', authenticate, ctrl.applySurveyor);

module.exports = router;
