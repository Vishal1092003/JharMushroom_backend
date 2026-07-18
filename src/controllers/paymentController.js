const { createOrder, verifySignature } = require('../services/razorpayService');

const razorpayMode = () => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    if (keyId.startsWith('rzp_live_')) return 'live';
    if (keyId.startsWith('rzp_test_')) return 'test';
    return 'missing';
};

// @desc    Public safe payment config diagnostic
// @route   GET /api/v1/payments/config
const getPaymentConfig = async (req, res) => {
    res.json({
        status: 'success',
        data: {
            provider: 'razorpay',
            mode: razorpayMode(),
            keyConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
        }
    });
};

// @desc    Create a Razorpay order for checkout
// @route   POST /api/v1/payments/razorpay-order
const createRazorpayOrder = async (req, res) => {
    try {
        const amountPaise = Number(req.body.amountPaise);
        const receipt = typeof req.body.receipt === 'string' && req.body.receipt.trim()
            ? req.body.receipt.trim()
            : `rcpt_${Date.now()}`;

        if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
            return res.status(400).json({ status: 'error', message: 'Valid amountPaise is required' });
        }

        const razorpayOrder = await createOrder(Math.round(amountPaise), receipt);
        res.json({
            status: 'success',
            data: {
                orderId: razorpayOrder.id,
                amountPaise: razorpayOrder.amount,
                keyId: process.env.RAZORPAY_KEY_ID,
                currency: razorpayOrder.currency || 'INR'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/v1/payments/verify
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        const valid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!valid) {
            return res.status(400).json({ status: 'error', message: 'Invalid payment signature' });
        }
        res.json({ status: 'success', data: { verified: true } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    getPaymentConfig,
    createRazorpayOrder,
    verifyRazorpayPayment
};
