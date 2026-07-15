const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes will be mounted 
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));

// Basic health check route
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Mushroom Mart API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: err.message || 'Server Error' });
});

module.exports = app;
