const Order = require('../models/Order');
const { createOrder, verifySignature } = require('../services/razorpayService');

// @desc    Create new order
// @route   POST /api/v1/orders
const addOrderItems = async (req, res) => {
    try {
        const {
            items,
            deliveryAddress,
            paymentMethod,
            subTotal,
            deliveryFee,
            totalAmount
        } = req.body;

        if (items && items.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No order items' });
        }

        const order = new Order({
            user: req.user._id,
            items,
            deliveryAddress,
            paymentMethod,
            subTotal,
            deliveryFee,
            totalAmount
        });

        // If online payment, create razorpay order
        if (paymentMethod === 'ONLINE') {
            const amountInPaise = Math.round(totalAmount * 100);
            const razorpayOrder = await createOrder(amountInPaise, `rcpt_${Date.now()}`);
            
            order.razorpayOrderId = razorpayOrder.id;
        }

        const createdOrder = await order.save();
        res.status(201).json({ status: 'success', data: createdOrder });

    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Verify Razorpay payment
// @route   POST /api/v1/orders/:id/verify
const verifyPayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        const { razorpayPaymentId, razorpaySignature } = req.body;

        const isValid = verifySignature(order.razorpayOrderId, razorpayPaymentId, razorpaySignature);

        if (isValid) {
            order.paymentStatus = 'COMPLETED';
            order.razorpayPaymentId = razorpayPaymentId;
            order.status = 'CONFIRMED';
            
            const updatedOrder = await order.save();
            res.json({ status: 'success', data: updatedOrder });
        } else {
            order.paymentStatus = 'FAILED';
            await order.save();
            res.status(400).json({ status: 'error', message: 'Invalid payment signature' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/v1/orders/myorders
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ status: 'success', data: orders });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/v1/orders
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'id name email').sort({ createdAt: -1 });
        res.json({ status: 'success', data: orders });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/v1/orders/:id/status
const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = req.body.status;
            const updatedOrder = await order.save();
            res.json({ status: 'success', data: updatedOrder });
        } else {
            res.status(404).json({ status: 'error', message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    addOrderItems,
    verifyPayment,
    getMyOrders,
    getOrders,
    updateOrderStatus
};
