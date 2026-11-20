import mongoose from "mongoose";

/* =========================================
   CONTACT MESSAGE MODEL
   Stores customer enquiries submitted
   through the public contact form.
========================================= */

const contactMessageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name is too short"],
            maxlength: [100, "Name is too long"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please provide a valid email address"
            ]
        },

        phone: {
            type: String,
            trim: true,
            maxlength: [20, "Phone number is too long"],
            default: ""
        },

        topic: {
            type: String,
            required: [true, "Enquiry type is required"],
            trim: true,
            maxlength: [100, "Topic is too long"]
        },

        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
            minlength: [10, "Message must be at least 10 characters"],
            maxlength: [2000, "Message cannot exceed 2000 characters"]
        },

        status: {
            type: String,
            enum: ["new", "read", "replied"],
            default: "new",
            index: true
        },

        ipAddress: {
            type: String,
            default: ""
        },

        userAgent: {
            type: String,
            default: "",
            maxlength: 500
        }
    },
    {
        timestamps: true
    }
);

// Compound index for admin list ordering.
contactMessageSchema.index({ status: 1, createdAt: -1 });

const ContactMessage = mongoose.model(
    "ContactMessage",
    contactMessageSchema
);

export default ContactMessage;