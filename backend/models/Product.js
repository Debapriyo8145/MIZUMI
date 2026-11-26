import mongoose from "mongoose";

const productSpecificationsSchema = new mongoose.Schema(
    {
        scientificName: { type: String, trim: true, default: "" },
        origin: { type: String, trim: true, default: "" },
        adultSize: { type: String, trim: true, default: "" },
        temperament: { type: String, trim: true, default: "" },
        diet: { type: String, trim: true, default: "" },
        waterTemperature: { type: String, trim: true, default: "" },
        phRange: { type: String, trim: true, default: "" },
        minimumTankSize: { type: String, trim: true, default: "" },
        careLevel: { type: String, trim: true, default: "" },
        notes: { type: String, trim: true, default: "" }
    },
    { _id: false }
);

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
            trim: true
        },
        category: {
            type: String,
            required: true,
            enum: ["fish", "cichlid", "goldfish", "plants", "equipment", "food", "hardscape"]
        },
        subcategory: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, default: 0, min: 0 },
        tag: { type: String, default: "" },
        description: { type: String, required: true, trim: true },
        image: { type: String, default: "" },
        gallery: {
            type: [{ type: String, trim: true }],
            default: [],
            validate: {
                validator: value => value.length <= 8,
                message: "A product can have up to 8 gallery images."
            }
        },
        specifications: {
            type: productSpecificationsSchema,
            default: () => ({})
        },
        size: { type: String, default: "" },
        care: { type: String, default: "Beginner" },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
