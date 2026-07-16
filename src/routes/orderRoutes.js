const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    verifyPayment,
    getMyOrders,
    getOrderById,
    getOrders,
    updateOrderStatus
} = require('../controllers/orderController');
const protect = require('../middlewares/authMiddleware');
const admin = require('../middlewares/adminMiddleware');

// Must be logged in for all order routes
router.use(protect);

router.route('/')
    .post(addOrderItems)
    .get(admin, getOrders); // Admin only to get all orders

router.get('/myorders', getMyOrders);

router.post('/:id/verify', verifyPayment);

router.get('/:id', getOrderById);

router.put('/:id/status', admin, updateOrderStatus); // Admin only to update status

module.exports = router;
