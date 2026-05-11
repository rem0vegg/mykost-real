const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { getWallet, getTransactions, requestWithdrawal } = require('../controllers/walletController');

router.get('/',              authenticate, getWallet);
router.get('/transactions',  authenticate, getTransactions);
router.post('/withdraw',     authenticate, requestWithdrawal);

module.exports = router;
