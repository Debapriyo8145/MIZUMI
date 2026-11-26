
import mongoose from "mongoose";

/* =========================================
   CONTACT MESSAGE MODEL
   Stores customer enquiries and admin replies.
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

        // Admin email reply history
        replies: {
            type: [
                {
                    message: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: [5000, "Reply cannot exceed 5000 characters"]
                    },

                    sentAt: {
                        type: Date,
                        default: Date.now
                    },

                    sentBy: {
                        type: String,
                        default: "admin"
                    },

                    emailStatus: {
                        type: String,
                        enum: ["pending","sent", "failed"],
                        default: "sent"
                    },

                    emailMessageId: {
                        type: String,
                        default: ""
                    }
                }
            ],
            default: []
        },

        // Most recent successful reply timestamp
        lastRepliedAt: {
            type: Date,
            default: null
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

// Indexes for admin message inbox
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });

const ContactMessage = mongoose.model(
    "ContactMessage",
    contactMessageSchema
);

export default ContactMessage;
