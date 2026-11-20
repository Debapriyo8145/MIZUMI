
import mongoose from "mongoose";

/* -------------------- ORDER ITEM -------------------- */

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    sku: {
        type: String,
        required: true,
        trim: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    image: {
        type: String,
        default: ""
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });


/* -------------------- CUSTOMER DETAILS -------------------- */

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ""
    },

    phone: {
        type: String,
        required: true,
        trim: true
    }
}, { _id: false });


/* -------------------- SHIPPING ADDRESS -------------------- */

const addressSchema = new mongoose.Schema({
    addressLine1: {
        type: String,
        required: true,
        trim: true
    },

    addressLine2: {
        type: String,
        trim: true,
        default: ""
    },

    city: {
        type: String,
        required: true,
        trim: true
    },

    state: {
        type: String,
        required: true,
        trim: true
    },

    postalCode: {
        type: String,
        required: true,
        trim: true
    },

    country: {
        type: String,
        default: "India",
        trim: true
    }
}, { _id: false });


/* -------------------- ORDER SCHEMA -------------------- */

const orderSchema = new mongoose.Schema({

    orderNumber: {
        type: String,
        unique: true,
        index: true
    },

    // Links an order to a registered customer account.
    // null means the order was placed as a guest.
    customerAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        default: null,
        index: true
    },

    customer: {
        type: customerSchema,
        required: true
    },

    shippingAddress: {
        type: addressSchema,
        required: true
    },

    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: items => items.length > 0,
            message: "An order must contain at least one product."
        }
    },

    subtotal: {
        type: Number,
        required: true,
        min: 0
    },

    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },

    discount: {
        type: Number,
        default: 0,
        min: 0
    },

    total: {
        type: Number,
        required: true,
        min: 0
    },

    paymentMethod: {
        type: String,
        enum: ["cash_on_delivery", "upi"],
        default: "cash_on_delivery"
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },

    orderStatus: {
        type: String,
        enum: [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ],
        default: "pending"
    },

    policyAcceptance: {
        accepted: {
            type: Boolean,
            required: true,
            default: false
        },
        version: {
            type: String,
            required: true
        },
        acceptedAt: {
            type: Date,
            required: true
        }
    },

    customerNote: {
        type: String,
        trim: true,
        default: ""
    },

    statusHistory: [{
        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled"
            ]
        },

        note: {
            type: String,
            default: ""
        },

        changedAt: {
            type: Date,
            default: Date.now
        }
    }]

}, {
    timestamps: true
});


/* -------------------- GENERATE ORDER NUMBER -------------------- */

orderSchema.pre("validate", function () {

    if (!this.orderNumber) {
        const randomCode = Math.floor(
            1000 + Math.random() * 9000
        );

        this.orderNumber = `MIZ-${Date.now()}-${randomCode}`;
    }

});


/* -------------------- DATABASE INDEXES -------------------- */

orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ customerAccount: 1, createdAt: -1 });


/* -------------------- EXPORT MODEL -------------------- */

const Order = mongoose.model("Order", orderSchema);

export default Order;
