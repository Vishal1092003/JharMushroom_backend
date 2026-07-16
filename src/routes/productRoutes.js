const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const protect = require('../middlewares/authMiddleware');
const admin = require('../middlewares/adminMiddleware');

const optionalProtect = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer')) {
        return next();
    }

    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
        req.user = null;
    }
    next();
};

// Public can view products, Admins can create
router.route('/')
    .get(optionalProtect, getProducts)
    .post(protect, admin, createProduct);

// Public can view specific product, Admins can update/delete
router.route('/:id')
    .get(getProductById)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);

module.exports = router;
