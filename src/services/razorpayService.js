const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay conditionally so it doesn't crash if keys are missing initially
let razorpayInstance = null;

const getRazorpayInstance = () => {
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.warn("Razorpay keys not set. Payment creation will fail.");
        } else {
            razorpayInstance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
        }
    }
    return razorpayInstance;
};

const createOrder = async (amountInPaise, receiptId) => {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay is not configured');

    const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId
    };

    return await instance.orders.create(options);
};

const verifySignature = (orderId, paymentId, signature) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');
    
    return expectedSignature === signature;
};

module.exports = {
    createOrder,
    verifySignature
};
