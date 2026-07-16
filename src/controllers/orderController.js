const Order = require('../models/Order');
const Product = require('../models/Product');
const { createOrder, verifySignature } = require('../services/razorpayService');
const { broadcast } = require('../realtime');

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

        if (!items || items.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No order items' });
        }

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ status: 'error', message: `Product not found: ${item.name}` });
            }
            if (product.stockQuantity < item.quantity) {
                return res.status(400).json({ status: 'error', message: `${product.name} has only ${product.stockQuantity} in stock` });
            }
        }

        const computedSubTotal = items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
        const resolvedSubTotal = subTotal ?? computedSubTotal;
        const resolvedDeliveryFee = deliveryFee ?? (resolvedSubTotal >= 500 ? 0 : 40);
        const resolvedTotalAmount = totalAmount ?? (resolvedSubTotal + resolvedDeliveryFee);

        const order = new Order({
            user: req.user._id,
            items,
            deliveryAddress,
            paymentMethod,
            subTotal: resolvedSubTotal,
            deliveryFee: resolvedDeliveryFee,
            totalAmount: resolvedTotalAmount
        });

        // If online payment, create razorpay order
        if (paymentMethod === 'ONLINE') {
            const amountInPaise = Math.round(resolvedTotalAmount * 100);
            const razorpayOrder = await createOrder(amountInPaise, `rcpt_${Date.now()}`);
            
            order.razorpayOrderId = razorpayOrder.id;
        }

        const createdOrder = await order.save();
        await Promise.all(items.map((item) =>
            Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } })
        ));
        broadcast({ type: 'orders_changed', action: 'created', id: createdOrder._id.toString() });
        broadcast({ type: 'products_changed', action: 'stock_updated' });
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
            broadcast({ type: 'orders_changed', action: 'payment_verified', id: updatedOrder._id.toString() });
            res.json({ status: 'success', data: updatedOrder });
        } else {
            order.paymentStatus = 'FAILED';
            await order.save();
            broadcast({ type: 'orders_changed', action: 'payment_failed', id: order._id.toString() });
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
            const previousStatus = order.status;
            order.status = req.body.status;
            const updatedOrder = await order.save();
            if (previousStatus !== 'CANCELLED' && updatedOrder.status === 'CANCELLED') {
                await Promise.all(updatedOrder.items.map((item) =>
                    Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } })
                ));
                broadcast({ type: 'products_changed', action: 'stock_restored' });
            }
            broadcast({ type: 'orders_changed', action: 'status_updated', id: updatedOrder._id.toString(), status: updatedOrder.status });
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
