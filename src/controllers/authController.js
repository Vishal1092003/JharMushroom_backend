const User = require('../models/User');
const generateToken = require('../utils/generateToken');

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

module.exports = {
    register,
    login,
    getProfile
};
