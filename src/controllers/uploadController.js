const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');

const uploadBuffer = (file) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        {
            folder: process.env.CLOUDINARY_FOLDER || 'mushroom-mart/products',
            resource_type: 'image'
        },
        (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(result);
        }
    );

    stream.end(file.buffer);
});

// @desc    Upload product images to Cloudinary (Admin only)
// @route   POST /api/v1/uploads/products
const uploadProductImages = async (req, res) => {
    try {
        if (!hasCloudinaryConfig()) {
            return res.status(500).json({
                status: 'error',
                message: 'Cloudinary is not configured. Fill CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env.'
            });
        }

        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ status: 'error', message: 'At least one image is required.' });
        }

        const uploaded = await Promise.all(files.map(uploadBuffer));
        const images = uploaded.map((item) => ({
            url: item.secure_url,
            publicId: item.public_id
        }));

        res.status(201).json({
            status: 'success',
            data: {
                images,
                urls: images.map((image) => image.url)
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    uploadProductImages
};
