const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getProfile,
    registerFcmToken,
    unregisterFcmToken
} = require('../controllers/authController');
const protect = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, unregisterFcmToken);

module.exports = router;
