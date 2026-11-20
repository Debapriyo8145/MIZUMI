
import mongoose from "mongoose";

/* -------------------- CUSTOMER ADDRESS -------------------- */

const addressSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            enum: ["Home", "Work", "Other"],
            default: "Home",
            trim: true
        },

        addressLine1: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        addressLine2: {
            type: String,
            trim: true,
            default: "",
            maxlength: 150
        },

        city: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        state: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        postalCode: {
            type: String,
            required: true,
            trim: true,
            maxlength: 12
        },

        country: {
            type: String,
            default: "India",
            trim: true
        },

        isDefault: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);


/* -------------------- CUSTOMER SCHEMA -------------------- */

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Customer name is required"],
            trim: true,
            maxlength: 100
        },

        email: {
            type: String,
            required: [true, "Email address is required"],
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254
        },

        phone: {
            type: String,
            required: [true, "Mobile number is required"],
            trim: true,
            maxlength: 20
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 8,
            select: false
        },

        addresses: {
            type: [addressSchema],
            default: [],
            validate: {
                validator: addresses => addresses.length <= 2,
                message: "A maximum of two delivery addresses is allowed."
            }
        },

        accountStatus: {
            type: String,
            enum: ["active", "suspended"],
            default: "active"
        },

        emailVerified: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.__v;
                return ret;
            }
        },
        toObject: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.__v;
                return ret;
            }
        }
    }
);


/* -------------------- DATABASE INDEXES -------------------- */

customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: 1 });


/* -------------------- EXPORT MODEL -------------------- */

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
