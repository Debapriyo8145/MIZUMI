
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        sku: {
            type: String,
            required: [true, "Product SKU is required"],
            unique: true,
            trim: true,
            uppercase: true
        },

        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            maxlength: 120
        },

        category: {
            type: String,
            required: [true, "Product category is required"],
            enum: [
                "fish",
                "cichlid",
                "goldfish",
                "plants",
                "equipment",
                "food",
                "hardscape"
            ],
            lowercase: true,
            trim: true
        },

        subcategory: {
            type: String,
            trim: true,
            default: "",
            maxlength: 80
        },

        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: 0
        },

        stock: {
            type: Number,
            default: 0,
            min: 0
        },

        tag: {
            type: String,
            trim: true,
            default: "",
            maxlength: 40
        },

        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000
        },

        image: {
            type: String,
            default: ""
        },

        gallery: {
            type: [{ type: String, trim: true }],
            default: [],
            validate: {
                validator: value => value.length <= 8,
                message: "A product can have up to 8 gallery images."
            }
        },

        // Flexible category-specific specifications.
        specifications: {
            type: mongoose.Schema.Types.Mixed,
            default: () => ({})
        },

        size: {
            type: String,
            default: ""
        },

        care: {
            type: String,
            default: "Beginner"
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
