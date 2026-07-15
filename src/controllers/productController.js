const Product = require('../models/Product');

// @desc    Fetch all products
// @route   GET /api/v1/products
const getProducts = async (req, res) => {
    try {
        // Find only available products for customers, all for admins
        const filter = req.user && req.user.role === 'admin' ? {} : { isAvailable: true };
        const products = await Product.find(filter);
        res.json({ status: 'success', data: products });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Fetch single product
// @route   GET /api/v1/products/:id
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json({ status: 'success', data: product });
        } else {
            res.status(404).json({ status: 'error', message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Create a product (Admin only)
// @route   POST /api/v1/products
const createProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        const createdProduct = await product.save();
        res.status(201).json({ status: 'success', data: createdProduct });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Update a product (Admin only)
// @route   PUT /api/v1/products/:id
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (product) {
            res.json({ status: 'success', data: product });
        } else {
            res.status(404).json({ status: 'error', message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Delete a product (Admin only)
// @route   DELETE /api/v1/products/:id
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product) {
            res.json({ status: 'success', message: 'Product removed' });
        } else {
            res.status(404).json({ status: 'error', message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
