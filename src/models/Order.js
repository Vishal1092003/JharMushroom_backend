const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true }
});

const addressSchema = new mongoose.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    deliveryAddress: addressSchema,
    subTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ['ONLINE', 'COD'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'PENDING'
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    status: {
        type: String,
        enum: ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
        default: 'PLACED'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
