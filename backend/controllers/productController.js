
import Product from "../models/Product.js";
import mongoose from "mongoose";
import { generateProductSku } from "../utils/skuGenerator.js";

import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";

import {
    uploadDirectory,
    publicApiUrl
} from "../config/uploads.js";


/* =========================================
   GET ALL ACTIVE PRODUCTS
   GET /api/v1/products
   Public
========================================= */

export const getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            subcategory,
            minPrice,
            maxPrice,
            availability,
            types,
            sort = "featured",
            page = 1,
            limit = 9
        } = req.query;

        const filter = {
            isActive: true
        };

        // Search
        if (search && search.trim()) {
            const escapedSearch = search
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const searchRegex = new RegExp(escapedSearch, "i");

            filter.$or = [
                { name: searchRegex },
                { sku: searchRegex },
                { category: searchRegex },
                { subcategory: searchRegex },
                { description: searchRegex }
            ];
        }

        // Category
        if (category && category !== "all") {
            if (category === "fish") {
                filter.category = {
                    $in: ["fish", "cichlid", "goldfish"]
                };
            } else {
                filter.category = category.toLowerCase();
            }
        }

        // Multiple product types
        if (types) {
            const selectedTypes = types
                .split(",")
                .map(type => type.trim().toLowerCase())
                .filter(Boolean);

            if (selectedTypes.length) {
                filter.category = {
                    $in: selectedTypes
                };
            }
        }

        // Subcategory
        if (subcategory) {
            filter.subcategory = subcategory;
        }

        // Price filtering
        if (minPrice !== undefined || maxPrice !== undefined) {
            const minimum = Number(minPrice);
            const maximum = Number(maxPrice);

            if (
                (minPrice !== undefined &&
                    (!Number.isFinite(minimum) || minimum < 0)) ||
                (maxPrice !== undefined &&
                    (!Number.isFinite(maximum) || maximum < 0)) ||
                (minPrice !== undefined &&
                    maxPrice !== undefined &&
                    minimum > maximum)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid price range."
                });
            }

            filter.price = {};

            if (minPrice !== undefined) {
                filter.price.$gte = minimum;
            }

            if (maxPrice !== undefined) {
                filter.price.$lte = maximum;
            }
        }

        // Stock availability
        if (availability === "in-stock") {
            filter.stock = { $gt: 0 };
        } else if (availability === "out-of-stock") {
            filter.stock = 0;
        } else if (availability && availability !== "all") {
            return res.status(400).json({
                success: false,
                message: "Invalid availability filter."
            });
        }

        // Sorting
        const sortOptions = {
            featured: { createdAt: -1 },
            newest: { createdAt: -1 },
            "price-low": { price: 1 },
            "price-high": { price: -1 },
            name: { name: 1 }
        };

        if (!sortOptions[sort]) {
            return res.status(400).json({
                success: false,
                message: "Invalid sorting option."
            });
        }

        // Pagination
        const currentPage = Number(page);
        const pageSize = Number(limit);

        if (
            !Number.isInteger(currentPage) ||
            !Number.isInteger(pageSize) ||
            currentPage < 1 ||
            pageSize < 1 ||
            pageSize > 50
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters."
            });
        }

        const totalProducts = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .sort(sortOptions[sort])
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize)
            .lean();

        return res.status(200).json({
            success: true,
            count: products.length,
            totalProducts,
            currentPage,
            totalPages: Math.ceil(totalProducts / pageSize),
            pageSize,
            products
        });

    } catch (error) {
        console.error("Get products error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch products."
        });
    }
};


/* =========================================
   CREATE PRODUCT
   POST /api/v1/products
   Admin
========================================= */

export const createProduct = async (req, res) => {
    try {
        const {
            name,
            category,
            subcategory,
            price,
            stock,
            tag,
            description,
            image,
            size,
            care,
            specifications
        } = req.body;

        
        if (
            !name?.trim() ||
            !category ||
            price === undefined ||
            price === null ||
            price === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Product name, category and price are required."
            });
        }


        const numericPrice = Number(price);
        const numericStock = stock === undefined ? 0 : Number(stock);

        if (
            !Number.isFinite(numericPrice) ||
            numericPrice < 0 ||
            !Number.isInteger(numericStock) ||
            numericStock < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price or stock value."
            });
        }

        const sku = await generateProductSku(name, category);


        const product = await Product.create({
            sku,
            name: name.trim(),
            category: category.toLowerCase().trim(),
            subcategory: subcategory?.trim() || "",
            price: numericPrice,
            stock: numericStock,
            tag: tag?.trim() || "",
            description: description?.trim() || "",
            image: image || "",
            size: size || "",
            care: care || "Beginner",
            specifications:
                specifications && typeof specifications === "object" && !Array.isArray(specifications)
                    ? specifications
                    : {}
        });


        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            product
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A duplicate SKU was generated. Please try again."
            });
        }

        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create product error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create product."
        });
    }
};


/* =========================================
   GET SINGLE PRODUCT
   GET /api/v1/products/:id
   Public
========================================= */

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const product = await Product.findOne({
            _id: id,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        return res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        console.error("Get product error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product."
        });
    }
};


/* =========================================
   UPDATE PRODUCT
   PUT /api/v1/products/:id
   Admin
========================================= */

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const allowedFields = [
            "sku",
            "name",
            "category",
            "subcategory",
            "price",
            "stock",
            "tag",
            "description",
            "image",
            "specifications",
            "size",
            "care"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        // Validate price
        if ("price" in updates) {
            const price = Number(updates.price);

            if (
                updates.price === null ||
                updates.price === "" ||
                !Number.isFinite(price) ||
                price < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be a valid non-negative number."
                });
            }

            updates.price = price;
        }

        // Validate stock
        if ("stock" in updates) {
            const stock = Number(updates.stock);

            if (
                updates.stock === null ||
                updates.stock === "" ||
                !Number.isInteger(stock) ||
                stock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a non-negative whole number."
                });
            }

            updates.stock = stock;
        }

        if ("name" in updates) {
            if (typeof updates.name !== "string" || !updates.name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name cannot be empty."
                });
            }

            updates.name = updates.name.trim();
        }


        if ("description" in updates) {
            if (typeof updates.description !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Description must be text."
                });
            }
        
            updates.description = updates.description.trim();
        }
        

        const product = await Product.findOneAndUpdate(
            {
                _id: id,
                isActive: true
            },
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            product
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A product with this SKU already exists."
            });
        }

        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product data."
            });
        }

        console.error("Update product error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update product."
        });
    }
};


/* =========================================
   SOFT DELETE PRODUCT
   DELETE /api/v1/products/:id
   Admin
========================================= */

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const product = await Product.findOneAndUpdate(
            {
                _id: id,
                isActive: true
            },
            {
                $set: {
                    isActive: false
                }
            },
            {
                new: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or already deleted."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product successfully removed from the store.",
            product
        });

    } catch (error) {
        console.error("Delete product error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete product."
        });
    }
};


/* =========================================
   UPLOAD PRODUCT IMAGE
   POST /api/v1/products/:id/image
   Admin only

   Local persistent storage.
   Converts images to WEBP.
   Maximum dimensions: 1200 x 1200.
========================================= */

export const uploadProductImage = async (req, res) => {
    let savedFilePath = null;

    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a product image."
            });
        }

        const product = await Product.findOne({
            _id: id,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        // Verify the actual image content.
        const metadata = await sharp(req.file.buffer).metadata();

        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
            return res.status(400).json({
                success: false,
                message: "Only valid JPG, PNG and WEBP images are allowed."
            });
        }

        // Generate a unique filename.
        const filename = `${randomUUID()}.webp`;

        savedFilePath = path.join(uploadDirectory, filename);

        // Resize and optimize without cropping.
        await sharp(req.file.buffer, {
            limitInputPixels: 40000000
        })
            .rotate()
            .resize({
                width: 1200,
                height: 1200,
                fit: "inside",
                withoutEnlargement: true
            })
            .webp({
                quality: 82,
                effort: 5
            })
            .toFile(savedFilePath);

        // Check final file size.
        const finalStats = await fs.stat(savedFilePath);

        if (finalStats.size > 5 * 1024 * 1024) {
            await fs.unlink(savedFilePath).catch(() => {});
            savedFilePath = null;

            return res.status(400).json({
                success: false,
                message: "Optimized image exceeds the 5 MB limit."
            });
        }

        // Build public image URL.
        const publicImageUrl =
            `${publicApiUrl}/uploads/products/${filename}`;

        const oldImage = product.image;

        // Save image URL to MongoDB.
        product.image = publicImageUrl;
        await product.save();

        // Delete previous local image after successful database save.
        if (oldImage) {
            try {
                const oldUrl = new URL(oldImage);
                const currentBase = new URL(publicApiUrl);

                if (
                    oldUrl.origin === currentBase.origin &&
                    oldUrl.pathname.startsWith("/uploads/products/")
                ) {
                    const oldFilename = path.basename(oldUrl.pathname);

                    if (
                        oldFilename !== filename &&
                        /^[a-f0-9-]+\.webp$/i.test(oldFilename)
                    ) {
                        const oldFilePath = path.resolve(
                            uploadDirectory,
                            oldFilename
                        );

                        const resolvedDirectory = path.resolve(uploadDirectory);

                        if (
                            oldFilePath.startsWith(
                                resolvedDirectory + path.sep
                            )
                        ) {
                            await fs.unlink(oldFilePath).catch(error => {
                                if (error.code !== "ENOENT") {
                                    console.warn(
                                        "Old image cleanup failed:",
                                        error.message
                                    );
                                }
                            });
                        }
                    }
                }
            } catch (cleanupError) {
                console.warn(
                    "Old product image cleanup skipped:",
                    cleanupError.message
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: "Product image uploaded successfully.",
            image: product.image,
            product
        });

    } catch (error) {
        // Remove newly written file if the upload operation failed.
        if (savedFilePath) {
            await fs.unlink(savedFilePath).catch(() => {});
        }

        console.error("Product image upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to upload product image."
        });
    }
};


/* =========================================
   UPLOAD PRODUCT GALLERY
   POST /api/v1/products/:id/gallery
   Admin only. Field name: images (max 8 total).
========================================= */

const removeLocalProductImage = async imageUrl => {
    if (!imageUrl) return;

    try {
        const parsedUrl = new URL(imageUrl);
        const baseUrl = new URL(publicApiUrl);

        if (
            parsedUrl.origin !== baseUrl.origin ||
            !parsedUrl.pathname.startsWith("/uploads/products/")
        ) return;

        const filename = path.basename(parsedUrl.pathname);
        if (!/^[a-f0-9-]+\.webp$/i.test(filename)) return;

        const targetPath = path.resolve(uploadDirectory, filename);
        const safeDirectory = path.resolve(uploadDirectory);
        if (!targetPath.startsWith(safeDirectory + path.sep)) return;

        await fs.unlink(targetPath).catch(error => {
            if (error.code !== "ENOENT") throw error;
        });
    } catch (error) {
        console.warn("Product gallery image cleanup skipped:", error.message);
    }
};

export const uploadProductGallery = async (req, res) => {
    const createdFiles = [];

    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID." });
        }
        if (!req.files?.length) {
            return res.status(400).json({ success: false, message: "Select at least one gallery image." });
        }

        const product = await Product.findOne({ _id: id, isActive: true });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        if (product.gallery.length + req.files.length > 8) {
            return res.status(400).json({
                success: false,
                message: `You can add only ${8 - product.gallery.length} more image(s). Maximum gallery size is 8.`
            });
        }

        for (const file of req.files) {
            const metadata = await sharp(file.buffer, { limitInputPixels: 40000000 }).metadata();
            if (!["jpeg", "png", "webp"].includes(metadata.format)) {
                throw new Error("One of the files is not a valid JPG, PNG or WEBP image.");
            }

            const filename = `${randomUUID()}.webp`;
            const destination = path.join(uploadDirectory, filename);

            await sharp(file.buffer, { limitInputPixels: 40000000 })
                .rotate()
                .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
                .webp({ quality: 82, effort: 5 })
                .toFile(destination);

            const stats = await fs.stat(destination);
            if (stats.size > 5 * 1024 * 1024) {
                await fs.unlink(destination).catch(() => {});
                throw new Error("An optimized gallery image exceeds the 5 MB limit.");
            }

            const imageUrl = `${publicApiUrl}/uploads/products/${filename}`;
            createdFiles.push({ path: destination, url: imageUrl });
        }

        product.gallery.push(...createdFiles.map(file => file.url));
        await product.save();

        return res.status(201).json({
            success: true,
            message: `${createdFiles.length} gallery image(s) uploaded successfully.`,
            gallery: product.gallery,
            product
        });
    } catch (error) {
        await Promise.all(createdFiles.map(file => fs.unlink(file.path).catch(() => {})));
        console.error("Product gallery upload error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Unable to upload gallery images."
        });
    }
};

/* =========================================
   DELETE PRODUCT GALLERY IMAGE
   DELETE /api/v1/products/:id/gallery/:index
   Admin only. Index is zero-based.
========================================= */

export const deleteProductGalleryImage = async (req, res) => {
    try {
        const { id, index } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID." });
        }
        if (!/^\d+$/.test(index)) {
            return res.status(400).json({ success: false, message: "Invalid gallery image index." });
        }

        const product = await Product.findOne({ _id: id, isActive: true });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const imageIndex = Number(index);
        if (imageIndex < 0 || imageIndex >= product.gallery.length) {
            return res.status(404).json({ success: false, message: "Gallery image not found." });
        }

        const [removedImage] = product.gallery.splice(imageIndex, 1);
        await product.save();
        await removeLocalProductImage(removedImage);

        return res.status(200).json({
            success: true,
            message: "Gallery image removed successfully.",
            gallery: product.gallery,
            product
        });
    } catch (error) {
        console.error("Delete gallery image error:", error);
        return res.status(500).json({ success: false, message: "Unable to remove gallery image." });
    }
};
