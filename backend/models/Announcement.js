
import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: "homepage-announcement"
        },

        primaryText: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            default: "WELCOME TO MIZUMI AQUATICS"
        },

        secondaryText: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
            default: "WHERE AQUATIC LIFE COMES ALIVE"
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

const Announcement = mongoose.model(
    "Announcement",
    announcementSchema
);

export default Announcement;
