const Order = require('../models/Order');
const Product = require('../models/Product');
const { createOrder, verifySignature } = require('../services/razorpayService');
const { broadcast } = require('../realtime');
const { notify } = require('../services/notificationService');

const nextStatuses = {
    PLACED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PACKED', 'CANCELLED'],
    PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: []
};
const validStatuses = Object.keys(nextStatuses);

const addStatusHistory = (order, status, actor, note = '') => {
    order.statusHistory.push({
        status,
        confirmedBy: actor?._id,
        confirmedByName: actor?.name || 'System',
        note,
        changedAt: new Date()
    });
};

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
            totalAmount,
            razorpayPaymentId
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No order items' });
        }

        const orderItems = [];
        const demandItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ status: 'error', message: `Product not found: ${item.name}` });
            }
            orderItems.push({
                ...item,
                reservedQuantity: 0,
                extraDemandQuantity: 0
            });
        }

        const computedSubTotal = items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
        const resolvedSubTotal = subTotal ?? computedSubTotal;
        const resolvedDeliveryFee = deliveryFee ?? (resolvedSubTotal >= 500 ? 0 : 40);
        const resolvedTotalAmount = totalAmount ?? (resolvedSubTotal + resolvedDeliveryFee);
        const reservedItems = [];

        const order = new Order({
            user: req.user._id,
            items: orderItems,
            deliveryAddress,
            paymentMethod,
            subTotal: resolvedSubTotal,
            deliveryFee: resolvedDeliveryFee,
            totalAmount: resolvedTotalAmount
        });

        if (paymentMethod === 'ONLINE' && razorpayPaymentId) {
            order.paymentStatus = 'COMPLETED';
            order.razorpayPaymentId = razorpayPaymentId;
            order.status = 'CONFIRMED';
        }

        // If online payment, create razorpay order
        if (paymentMethod === 'ONLINE' && !razorpayPaymentId) {
            const amountInPaise = Math.round(resolvedTotalAmount * 100);
            const razorpayOrder = await createOrder(amountInPaise, `rcpt_${Date.now()}`);
            
            order.razorpayOrderId = razorpayOrder.id;
        }

        for (const item of order.items) {
            const product = await Product.findById(item.product);
            const available = Math.max(product?.stockQuantity || 0, 0);
            const requested = Math.max(item.quantity || 0, 0);
            const reserveQty = Math.min(available, requested);

            if (reserveQty > 0) {
                const reserved = await Product.findOneAndUpdate(
                    { _id: item.product, stockQuantity: { $gte: reserveQty } },
                    { $inc: { stockQuantity: -reserveQty } },
                    { new: true }
                );
                if (reserved) {
                    item.reservedQuantity = reserveQty;
                    reservedItems.push({ product: item.product, quantity: reserveQty });
                }
            }

            item.extraDemandQuantity = requested - item.reservedQuantity;
            if (item.extraDemandQuantity > 0) {
                order.hasExtraDemand = true;
                demandItems.push({
                    name: item.name,
                    requested,
                    reserved: item.reservedQuantity,
                    extra: item.extraDemandQuantity
                });
            }
        }

        if (order.hasExtraDemand) {
            order.status = 'PLACED';
        }
        addStatusHistory(order, order.status, null, 'Order placed');

        let createdOrder;
        try {
            createdOrder = await order.save();
        } catch (error) {
            await Promise.all(reservedItems.map((done) =>
                Product.findByIdAndUpdate(done.product, { $inc: { stockQuantity: done.quantity } })
            ));
            throw error;
        }
        broadcast({ type: 'orders_changed', action: 'created', id: createdOrder._id.toString() });
        broadcast({ type: 'products_changed', action: 'stock_updated' });
        notify({
            type: 'notification',
            audience: 'admin',
            title: 'New order placed',
            body: `${createdOrder._id} · ${items.length} line item(s) · total ₹${resolvedTotalAmount}`,
            category: 'order',
            entityType: 'order',
            entityId: createdOrder._id.toString()
        });
        if (demandItems.length > 0) {
            const demandSummary = demandItems
                .map((item) => `${item.name}: ${item.extra} extra requested`)
                .join(', ');
            notify({
                type: 'notification',
                audience: 'admin',
                title: 'Extra demand pending',
                body: `${createdOrder._id} needs admin attention. ${demandSummary}.`,
                category: 'order',
                entityType: 'order',
                entityId: createdOrder._id.toString()
            });
        }
        notify({
            type: 'notification',
            audience: 'user',
            userId: req.user._id.toString(),
            title: 'Order placed',
            body: `${createdOrder._id} was placed successfully.`,
            category: 'order',
            entityType: 'order',
            entityId: createdOrder._id.toString()
        });
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
            const previousStatus = order.status;
            order.paymentStatus = 'COMPLETED';
            order.razorpayPaymentId = razorpayPaymentId;
            order.status = order.hasExtraDemand ? 'PLACED' : 'CONFIRMED';
            if (order.status !== previousStatus) {
                addStatusHistory(order, order.status, null, 'Payment verified');
            }
            
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

// @desc    Get a single order for owner or admin
// @route   GET /api/v1/orders/:id
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
        const isOwner = order.user.toString() === req.user._id.toString();
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ status: 'error', message: 'Not authorized to view this order' });
        }

        res.json({ status: 'success', data: order });
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
            const nextStatus = typeof req.body.status === 'string'
                ? req.body.status.trim().toUpperCase()
                : '';
            if (!validStatuses.includes(nextStatus)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid order status'
                });
            }
            if (nextStatus === previousStatus) {
                return res.status(409).json({
                    status: 'error',
                    message: `Order is already ${nextStatus}`
                });
            }
            if (!nextStatuses[previousStatus]?.includes(nextStatus)) {
                return res.status(409).json({
                    status: 'error',
                    message: `Cannot move order from ${previousStatus} to ${nextStatus}`
                });
            }
            if (
                order.paymentMethod === 'ONLINE' &&
                order.paymentStatus !== 'COMPLETED' &&
                nextStatus !== 'CANCELLED'
            ) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Online payment must be completed before advancing this order'
                });
            }
            order.status = nextStatus;
            addStatusHistory(order, nextStatus, req.user, `Moved from ${previousStatus} to ${nextStatus}`);
            const updatedOrder = await order.save();
            if (previousStatus !== 'CANCELLED' && updatedOrder.status === 'CANCELLED') {
                await Promise.all(updatedOrder.items.map((item) =>
                    Product.findByIdAndUpdate(item.product, {
                        $inc: { stockQuantity: item.reservedQuantity ?? item.quantity }
                    })
                ));
                broadcast({ type: 'products_changed', action: 'stock_restored' });
            }
            broadcast({ type: 'orders_changed', action: 'status_updated', id: updatedOrder._id.toString(), status: updatedOrder.status });
            notify({
                type: 'notification',
                audience: 'admin',
                title: 'Order status updated',
                body: `${updatedOrder._id} moved from ${previousStatus} to ${updatedOrder.status}.`,
                category: 'order',
                entityType: 'order',
                entityId: updatedOrder._id.toString()
            });
            notify({
                type: 'notification',
                audience: 'user',
                userId: updatedOrder.user.toString(),
                title: 'Order update',
                body: `${updatedOrder._id} is now ${updatedOrder.status}.`,
                category: 'order',
                entityType: 'order',
                entityId: updatedOrder._id.toString()
            });
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
    getOrderById,
    getOrders,
    updateOrderStatus
};
