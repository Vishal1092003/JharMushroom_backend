const express = require('express');
const router = express.Router();
const {
    getPaymentConfig,
    createRazorpayOrder,
    verifyRazorpayPayment
} = require('../controllers/paymentController');
const protect = require('../middlewares/authMiddleware');

router.get('/config', getPaymentConfig);
router.post('/razorpay-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyRazorpayPayment);

module.exports = router;
