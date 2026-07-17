const Product = require('../models/Product');
const { broadcast } = require('../realtime');

const normalizeProductBody = (body) => {
    const imageUrls = Array.isArray(body.imageUrls)
        ? body.imageUrls.map((url) => String(url).trim()).filter(Boolean)
        : [];
    const fallbackImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const normalizedImageUrls = imageUrls.length > 0
        ? imageUrls
        : (fallbackImageUrl ? [fallbackImageUrl] : []);

    return {
        ...body,
        imageUrl: fallbackImageUrl || normalizedImageUrls[0] || '',
        imageUrls: normalizedImageUrls,
        sellerAddress: typeof body.sellerAddress === 'string' ? body.sellerAddress.trim() : ''
    };
};

// @desc    Fetch all products
// @route   GET /api/v1/products
const getProducts = async (req, res) => {
    try {
        // Find only available products for customers, all for admins
        const isAdmin = req.user && (req.user.role === 'admin' || req.user.isAdmin === true);
        const filter = isAdmin ? {} : { isAvailable: true };
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
        const product = new Product(normalizeProductBody(req.body));
        const createdProduct = await product.save();
        broadcast({ type: 'products_changed', action: 'created', id: createdProduct._id.toString() });
        broadcast({
            type: 'notification',
            audience: 'admin',
            title: 'Product created',
            body: `${createdProduct.name} was added with stock ${createdProduct.stockQuantity}.`,
            category: 'product',
            entityType: 'product',
            entityId: createdProduct._id.toString()
        });
        if (createdProduct.isAvailable) {
            broadcast({
                type: 'notification',
                audience: 'all',
                title: 'New product available',
                body: `${createdProduct.name} is now available in the catalog.`,
                category: 'product',
                entityType: 'product',
                entityId: createdProduct._id.toString()
            });
        }
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
            normalizeProductBody(req.body),
            { new: true, runValidators: true }
        );

        if (product) {
            broadcast({ type: 'products_changed', action: 'updated', id: product._id.toString() });
            broadcast({
                type: 'notification',
                audience: 'admin',
                title: 'Product updated',
                body: `${product.name} now has stock ${product.stockQuantity}.`,
                category: 'product',
                entityType: 'product',
                entityId: product._id.toString()
            });
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
            broadcast({ type: 'products_changed', action: 'deleted', id: product._id.toString() });
            broadcast({
                type: 'notification',
                audience: 'admin',
                title: 'Product deleted',
                body: `${product.name} was removed from the catalog.`,
                category: 'product',
                entityType: 'product',
                entityId: product._id.toString()
            });
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
