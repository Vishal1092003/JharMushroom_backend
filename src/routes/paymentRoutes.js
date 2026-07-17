const express = require('express');
const router = express.Router();
const {
    createRazorpayOrder,
    verifyRazorpayPayment
} = require('../controllers/paymentController');
const protect = require('../middlewares/authMiddleware');

router.post('/razorpay-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyRazorpayPayment);

module.exports = router;
