import express from "express";
import multer from "multer";

import { protectAdmin } from "../middleware/authMiddleware.js";

import {
    getHero,
    updateHero,
    uploadHeroImage
} from "../controllers/heroController.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 8 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPG, PNG and WebP images are allowed.")
            );
        }

        callback(null, true);
    }
});

// Public homepage content
router.get("/", getHero);

// Admin-only editing
router.put("/", protectAdmin, updateHero);

router.post(
    "/image",
    protectAdmin,
    upload.single("image"),
    uploadHeroImage
);

export default router;