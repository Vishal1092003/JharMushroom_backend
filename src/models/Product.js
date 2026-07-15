const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    pricePerUnit: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        default: 'kg'
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    harvestDate: {
        type: Date
    },
    imageUrl: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
