const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/capabilityController');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

router.get('/',                                authenticate, ctrl.getMyCapabilities);
router.post('/mover',                          authenticate, ctrl.applyMover);
router.put('/mover',                           authenticate, ctrl.updateMoverProfile);
router.post('/mover/upload/:field',            authenticate, upload.single('photo'), ctrl.uploadMoverDoc);
router.post('/surveyor',                       authenticate, ctrl.applySurveyor);

module.exports = router;
