const express = require('express');
const multer = require('multer');
const protect = require('../middlewares/authMiddleware');
const admin = require('../middlewares/adminMiddleware');
const { uploadProductImages } = require('../controllers/uploadController');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 8
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed.'));
            return;
        }
        cb(null, true);
    }
});

router.post('/products', protect, admin, upload.array('images', 8), uploadProductImages);

module.exports = router;
