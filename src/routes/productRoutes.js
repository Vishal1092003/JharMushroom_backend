const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const protect = require('../middlewares/authMiddleware');
const admin = require('../middlewares/adminMiddleware');

// Public can view products, Admins can create
router.route('/')
    .get(getProducts)
    .post(protect, admin, createProduct);

// Public can view specific product, Admins can update/delete
router.route('/:id')
    .get(getProductById)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);

module.exports = router;
