import multer from "multer";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const uploadProductImage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 8
    },
    fileFilter: (req, file, callback) => {
        if (!allowedTypes.has(file.mimetype)) {
            return callback(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
        callback(null, true);
    }
});

export default uploadProductImage;
