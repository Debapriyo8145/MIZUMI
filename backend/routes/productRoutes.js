import express from "express";

import {
    getProducts,
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    uploadProductGallery,
    deleteProductGalleryImage
} from "../controllers/productController.js";

import { protectAdmin } from "../middleware/authMiddleware.js";
import uploadProductImageMiddleware from "../middleware/imageUpload.js";

const router = express.Router();

// Public product routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin product routes
router.post("/", protectAdmin, createProduct);
router.put("/:id", protectAdmin, updateProduct);
router.delete("/:id", protectAdmin, deleteProduct);

// Existing single primary-image upload remains unchanged.
router.post(
    "/:id/image",
    protectAdmin,
    (req, res, next) => {
        uploadProductImageMiddleware.single("image")(req, res, error => {
            if (!error) return next();

            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Image must be 5 MB or smaller."
                : error.message || "Invalid image upload.";

            return res.status(400).json({ success: false, message });
        });
    },
    uploadProductImage
);

// Additional gallery images. Multipart field name: images.
router.post(
    "/:id/gallery",
    protectAdmin,
    (req, res, next) => {
        uploadProductImageMiddleware.array("images", 8)(req, res, error => {
            if (!error) return next();

            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Each image must be 5 MB or smaller."
                : error.code === "LIMIT_FILE_COUNT"
                    ? "You can upload up to 8 images per request."
                    : error.message || "Invalid gallery upload.";

            return res.status(400).json({ success: false, message });
        });
    },
    uploadProductGallery
);

router.delete("/:id/gallery/:index", protectAdmin, deleteProductGalleryImage);

export default router;
