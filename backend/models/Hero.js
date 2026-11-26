import mongoose from "mongoose";

const heroSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: "homepage-hero"
        },

        eyebrow: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "A WORLD BENEATH THE SURFACE"
        },

        heading: {
            type: String,
            trim: true,
            maxlength: 180,
            default: "Bring Nature Into Your Living Space."
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "Discover extraordinary freshwater fish, thoughtfully selected aquarium essentials and everything you need to create your own underwater world."
        },

        primaryButtonText: {
            type: String,
            trim: true,
            maxlength: 60,
            default: "Explore Our Collection"
        },

        primaryButtonUrl: {
            type: String,
            trim: true,
            maxlength: 300,
            default: "shop.html"
        },

        secondaryButtonText: {
            type: String,
            trim: true,
            maxlength: 60,
            default: "Our Services"
        },

        secondaryButtonUrl: {
            type: String,
            trim: true,
            maxlength: 300,
            default: "#services"
        },

        heroNote: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "INSPIRED BY NATURE. CREATED FOR AQUATIC LIFE."
        },

        imageUrl: {
            type: String,
            default: ""
        },

        imagePositionX: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },

        imagePositionY: {
            type: Number,
            min: 0,
            max: 100,
            default: 48
        },

        overlayOpacity: {
            type: Number,
            min: 0,
            max: 100,
            default: 65
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

const Hero = mongoose.model("Hero", heroSchema);

export default Hero;