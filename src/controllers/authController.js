const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const normalizeFcmTokenBody = (body = {}) => ({
    token: typeof body.token === 'string' ? body.token.trim() : '',
    platform: typeof body.platform === 'string' && body.platform.trim()
        ? body.platform.trim()
        : 'android',
    deviceId: typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
});

// @desc    Register a new user
// @route   POST /api/v1/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ status: 'error', message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password
        });

        if (user) {
            res.status(201).json({
                status: 'success',
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isAdmin: user.role === 'admin' || user.isAdmin === true,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(400).json({ status: 'error', message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/v1/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                status: 'success',
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isAdmin: user.role === 'admin' || user.isAdmin === true,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                status: 'success',
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isAdmin: user.role === 'admin' || user.isAdmin === true
                }
            });
        } else {
            res.status(404).json({ status: 'error', message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Register/update this device FCM token for the logged-in user
// @route   POST /api/v1/auth/fcm-token
const registerFcmToken = async (req, res) => {
    try {
        const { token, platform, deviceId } = normalizeFcmTokenBody(req.body);
        if (!token) {
            return res.status(400).json({ status: 'error', message: 'FCM token is required' });
        }

        const existing = await User.updateOne(
            { _id: req.user._id, 'fcmTokens.token': token },
            {
                $set: {
                    'fcmTokens.$.platform': platform,
                    'fcmTokens.$.deviceId': deviceId,
                    'fcmTokens.$.updatedAt': new Date()
                }
            }
        );

        if (existing.matchedCount === 0) {
            await User.findByIdAndUpdate(req.user._id, {
                $push: {
                    fcmTokens: {
                        token,
                        platform,
                        deviceId,
                        updatedAt: new Date()
                    }
                }
            });
        }

        res.json({ status: 'success', message: 'FCM token registered' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Remove this device FCM token for the logged-in user
// @route   DELETE /api/v1/auth/fcm-token
const unregisterFcmToken = async (req, res) => {
    try {
        const { token } = normalizeFcmTokenBody(req.body);
        if (!token) {
            return res.status(400).json({ status: 'error', message: 'FCM token is required' });
        }

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { fcmTokens: { token } }
        });

        res.json({ status: 'success', message: 'FCM token removed' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    registerFcmToken,
    unregisterFcmToken
};
