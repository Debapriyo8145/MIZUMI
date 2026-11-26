import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

import Hero from "../models/Hero.js";
import { uploadDirectory } from "../config/uploads.js";

const HERO_ID = "homepage-hero";
const HERO_IMAGE_NAME = "homepage-hero.webp";

const defaultHero = {
    _id: HERO_ID,
    eyebrow: "A WORLD BENEATH THE SURFACE",
    heading: "Bring Nature Into Your Living Space.",
    description:
        "Discover extraordinary freshwater fish, thoughtfully selected aquarium essentials and everything you need to create your own underwater world.",
    primaryButtonText: "Explore Our Collection",
    primaryButtonUrl: "shop.html",
    secondaryButtonText: "Our Services",
    secondaryButtonUrl: "#services",
    heroNote: "INSPIRED BY NATURE. CREATED FOR AQUATIC LIFE.",
    imageUrl: "",
    imagePositionX: 50,
    imagePositionY: 48,
    overlayOpacity: 65,
    isActive: true
};

const allowedFields = [
    "eyebrow",
    "heading",
    "description",
    "primaryButtonText",
    "primaryButtonUrl",
    "secondaryButtonText",
    "secondaryButtonUrl",
    "heroNote",
    "imagePositionX",
    "imagePositionY",
    "overlayOpacity",
    "isActive"
];

async function getOrCreateHero() {
    let hero = await Hero.findById(HERO_ID);

    if (!hero) {
        hero = await Hero.create(defaultHero);
    }

    return hero;
}

// GET /api/v1/hero
export async function getHero(req, res) {
    try {
        const hero = await getOrCreateHero();

        return res.status(200).json({
            success: true,
            hero
        });

    } catch (error) {
        console.error("Get hero error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load homepage hero."
        });
    }
}

// PUT /api/v1/hero
export async function updateHero(req, res) {
    try {
        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const numericFields = [
            "imagePositionX",
            "imagePositionY",
            "overlayOpacity"
        ];

        for (const field of numericFields) {
            if (updates[field] !== undefined) {
                const value = Number(updates[field]);

                if (!Number.isFinite(value) || value < 0 || value > 100) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be between 0 and 100.`
                    });
                }

                updates[field] = value;
            }
        }

        if (updates.isActive !== undefined &&
            typeof updates.isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive must be true or false."
            });
        }

        for (const field of Object.keys(updates)) {
            if (typeof updates[field] === "string") {
                updates[field] = updates[field].trim();
            }
        }

        const hero = await Hero.findByIdAndUpdate(
            HERO_ID,
            { $set: updates },
            {
                new: true,
                runValidators: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Homepage hero updated successfully.",
            hero
        });

    } catch (error) {
        console.error("Update hero error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Could not update homepage hero."
        });
    }
}

// POST /api/v1/hero/image
export async function uploadHeroImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image."
            });
        }

        const imagePath = path.join(
            uploadDirectory,
            HERO_IMAGE_NAME
        );

        await fs.mkdir(uploadDirectory, { recursive: true });

        await sharp(req.file.buffer)
            .rotate()
            .resize({
                width: 2400,
                withoutEnlargement: true
            })
            .webp({
                quality: 85,
                effort: 5
            })
            .toFile(imagePath);

        const imageUrl =
            `/uploads/products/${HERO_IMAGE_NAME}?v=${Date.now()}`;

        const hero = await Hero.findByIdAndUpdate(
            HERO_ID,
            {
                $set: { imageUrl }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Hero image uploaded successfully.",
            imageUrl,
            hero
        });

    } catch (error) {
        console.error("Hero image upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not upload hero image."
        });
    }
}