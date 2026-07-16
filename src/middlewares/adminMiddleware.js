const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.isAdmin === true)) {
        next();
    } else {
        res.status(403).json({ status: 'error', message: 'Not authorized as an admin' });
    }
};

module.exports = admin;
