
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

/* =====================================================
   ORDER CONTROLLER
   ===================================================== */

const VALID_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
];

const STATUS_TRANSITIONS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: []
};

const MAX_ORDER_ITEMS = 30;
const MAX_ITEM_QUANTITY = 100;
const CURRENT_POLICY_VERSION = "2026-11-18";

/* =====================================================
   HELPERS
   ===================================================== */

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePositiveInteger(value, fallback, maximum) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        return fallback;
    }

    return Math.min(parsed, maximum);
}

function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(phone) {
    return /^[+]?[0-9\s()-]{7,20}$/.test(phone);
}

function validPostalCode(code) {
    return /^[a-zA-Z0-9\s-]{3,12}$/.test(code);
}

/* =====================================================
   1. CREATE ORDER
   Guest and authenticated customer checkout
   ===================================================== */

export const createOrder = async (req, res) => {
    let session;

    try {
        const {
            customer,
            shippingAddress,
            items,
            paymentMethod,
            customerNote,
            policyAcceptance
        } = req.body || {};

        /* POLICY ACCEPTANCE VALIDATION */

        if (
            policyAcceptance?.accepted !== true ||
            policyAcceptance?.version !== CURRENT_POLICY_VERSION
        ) {
            return sendError(
                res,
                400,
                "Please accept the current Terms & Conditions, Privacy Policy, and Return & Refund Policy before placing your order."
            );
        }

        const acceptedPolicy = {
            accepted: true,
            version: CURRENT_POLICY_VERSION,
            acceptedAt: new Date()
        };

        /* CUSTOMER VALIDATION */

        const customerName = cleanString(customer?.name);
        const customerPhone = cleanString(customer?.phone);
        const customerEmail = cleanString(customer?.email);

        if (!customerName || !customerPhone) {
            return sendError(
                res,
                400,
                "Customer name and phone number are required."
            );
        }

        if (customerName.length > 100) {
            return sendError(res, 400, "Customer name is too long.");
        }

        if (!validPhone(customerPhone)) {
            return sendError(res, 400, "Invalid phone number.");
        }

        if (customerEmail) {
            if (
                customerEmail.length > 254 ||
                !validEmail(customerEmail)
            ) {
                return sendError(res, 400, "Invalid email address.");
            }
        }

        /* ADDRESS VALIDATION */

        const addressLine1 = cleanString(shippingAddress?.addressLine1);
        const addressLine2 = cleanString(shippingAddress?.addressLine2);
        const city = cleanString(shippingAddress?.city);
        const state = cleanString(shippingAddress?.state);
        const postalCode = cleanString(shippingAddress?.postalCode);
        const country = cleanString(shippingAddress?.country) || "India";

        if (!addressLine1 || !city || !state || !postalCode) {
            return sendError(
                res,
                400,
                "Complete shipping address is required."
            );
        }

        if (
            addressLine1.length > 200 ||
            addressLine2.length > 200 ||
            city.length > 100 ||
            state.length > 100 ||
            country.length > 100
        ) {
            return sendError(
                res,
                400,
                "One or more address fields are too long."
            );
        }

        if (!validPostalCode(postalCode)) {
            return sendError(res, 400, "Invalid postal code.");
        }

        /* ORDER ITEMS VALIDATION */

        if (!Array.isArray(items) || items.length === 0) {
            return sendError(
                res,
                400,
                "Your order must contain at least one product."
            );
        }

        if (items.length > MAX_ORDER_ITEMS) {
            return sendError(
                res,
                400,
                "Too many different products in one order."
            );
        }

        /*
          UPI is disabled until a payment gateway is integrated.
          Never accept an online payment method without verifying
          the actual payment on the server.
        */

        const selectedPaymentMethod =
            paymentMethod || "cash_on_delivery";

        if (selectedPaymentMethod !== "cash_on_delivery") {
            return sendError(
                res,
                400,
                "Online payments are temporarily unavailable. Please select Cash on Delivery."
            );
        }

        /* CUSTOMER NOTE VALIDATION */

        const note = cleanString(customerNote);

        if (note.length > 1000) {
            return sendError(
                res,
                400,
                "Order note must be 1000 characters or fewer."
            );
        }

        /*
          Combine duplicate product IDs.
          This prevents duplicate stock deductions.
        */

        const quantities = new Map();

        for (const item of items) {
            const productId = String(item?.productId || "");
            const quantity = Number(item?.quantity);

            if (!mongoose.isValidObjectId(productId)) {
                return sendError(
                    res,
                    400,
                    "An order contains an invalid product."
                );
            }

            if (
                !Number.isSafeInteger(quantity) ||
                quantity < 1 ||
                quantity > MAX_ITEM_QUANTITY
            ) {
                return sendError(
                    res,
                    400,
                    "Product quantity must be between 1 and 100."
                );
            }

            const currentQuantity = quantities.get(productId) || 0;
            const newQuantity = currentQuantity + quantity;

            if (newQuantity > MAX_ITEM_QUANTITY) {
                return sendError(
                    res,
                    400,
                    "Maximum quantity per product is 100."
                );
            }

            quantities.set(productId, newQuantity);
        }

        /* DATABASE TRANSACTION */

        session = await mongoose.startSession();

        let createdOrder;

        await session.withTransaction(async () => {
            const orderItems = [];
            let subtotal = 0;

            for (const [productId, quantity] of quantities) {
                const product = await Product.findOne({
                    _id: productId,
                    isActive: true
                }).session(session);

                if (!product) {
                    throw new Error("PRODUCT_NOT_AVAILABLE");
                }

                if (
                    !Number.isFinite(product.price) ||
                    product.price < 0
                ) {
                    throw new Error("INVALID_PRODUCT_PRICE");
                }

                /*
                  Atomically decrease stock only when enough stock
                  is available. This protects against overselling.
                */

                const stockUpdate = await Product.updateOne(
                    {
                        _id: productId,
                        isActive: true,
                        stock: { $gte: quantity }
                    },
                    {
                        $inc: { stock: -quantity }
                    },
                    { session }
                );

                if (stockUpdate.modifiedCount !== 1) {
                    throw new Error("INSUFFICIENT_STOCK");
                }

                /*
                  Product price and details are taken from MongoDB,
                  never from customer-submitted data.
                */

                const itemSubtotal = roundMoney(
                    product.price * quantity
                );

                subtotal = roundMoney(subtotal + itemSubtotal);

                orderItems.push({
                    product: product._id,
                    sku: product.sku,
                    name: product.name,
                    image: product.image || "",
                    price: product.price,
                    quantity,
                    subtotal: itemSubtotal
                });
            }

            // Shipping is temporarily free.
            const shippingFee = 0;
            const discount = 0;

            const total = roundMoney(
                subtotal + shippingFee - discount
            );

            const newOrder = await Order.create(
                [
                    {
                        // Link order to the authenticated customer.
                        // Guest orders remain unlinked.
                        customerAccount: req.customer?._id || null,

                        customer: {
                            name: customerName,
                            email: customerEmail,
                            phone: customerPhone
                        },

                        shippingAddress: {
                            addressLine1,
                            addressLine2,
                            city,
                            state,
                            postalCode,
                            country
                        },

                        items: orderItems,

                        subtotal,
                        shippingFee,
                        discount,
                        total,

                        paymentMethod: "cash_on_delivery",
                        paymentStatus: "pending",

                        customerNote: note,

                        policyAcceptance: acceptedPolicy,

                        orderStatus: "pending",

                        statusHistory: [
                            {
                                status: "pending",
                                note: "Order placed."
                            }
                        ]
                    }
                ],
                { session }
            );

            createdOrder = newOrder[0];
        });

        return res.status(201).json({
            success: true,
            message: "Order placed successfully.",
            order: createdOrder
        });

    } catch (error) {
        if (error.message === "PRODUCT_NOT_AVAILABLE") {
            return sendError(
                res,
                400,
                "One or more products are no longer available."
            );
        }

        if (error.message === "INSUFFICIENT_STOCK") {
            return sendError(
                res,
                409,
                "Insufficient stock for one or more products."
            );
        }

        if (error.message === "INVALID_PRODUCT_PRICE") {
            return sendError(
                res,
                400,
                "A product has an invalid price. Please contact the store."
            );
        }

        console.error("Create order error:", error);

        return sendError(
            res,
            500,
            "Unable to place your order. Please try again."
        );

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};


/* =====================================================
   2. GET CUSTOMER ORDER HISTORY
   Authenticated customer only
   ===================================================== */

export const getMyOrders = async (req, res) => {
    try {
        const page = parsePositiveInteger(
            req.query.page,
            1,
            Number.MAX_SAFE_INTEGER
        );

        const limit = parsePositiveInteger(
            req.query.limit,
            10,
            25
        );

        const skip = (page - 1) * limit;

        // Never retrieve orders using email or phone.
        // Only the authenticated account ID is used.
        const filter = {
            customerAccount: req.customer._id
        };

        /* OPTIONAL STATUS FILTER */

        if (req.query.status) {
            if (!VALID_STATUSES.includes(req.query.status)) {
                return sendError(
                    res,
                    400,
                    "Invalid order status."
                );
            }

            filter.orderStatus = req.query.status;
        }

        const [orders, totalOrders] = await Promise.all([
            Order.find(filter)
                .select("-__v")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Order.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            orders,
            totalOrders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            pageSize: limit
        });

    } catch (error) {
        console.error("Customer order history error:", error);

        return sendError(
            res,
            500,
            "Unable to retrieve your orders."
        );
    }
};


/* =====================================================
   3. GET SINGLE CUSTOMER ORDER
   Authenticated customer only
   ===================================================== */

export const getMyOrderById = async (req, res) => {
    try {
        const identifier = cleanString(req.params.id);

        if (!identifier || identifier.length > 100) {
            return sendError(
                res,
                400,
                "Invalid order identifier."
            );
        }

        // Ownership is always checked against the logged-in account.
        const ownershipFilter = {
            customerAccount: req.customer._id
        };

        let order;

        if (mongoose.isValidObjectId(identifier)) {
            order = await Order.findOne({
                ...ownershipFilter,
                _id: identifier
            })
                .select("-__v")
                .lean();

        } else {
            order = await Order.findOne({
                ...ownershipFilter,
                orderNumber: identifier
            })
                .select("-__v")
                .lean();
        }

        if (!order) {
            return sendError(
                res,
                404,
                "Order not found."
            );
        }

        return res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Customer order detail error:", error);

        return sendError(
            res,
            500,
            "Unable to retrieve order details."
        );
    }
};


/* =====================================================
   4. GET ALL ORDERS
   Admin only
   ===================================================== */

export const getOrders = async (req, res) => {
    try {
        const page = parsePositiveInteger(
            req.query.page,
            1,
            Number.MAX_SAFE_INTEGER
        );

        const limit = parsePositiveInteger(
            req.query.limit,
            10,
            50
        );

        const skip = (page - 1) * limit;

        const filter = {};

        /* STATUS FILTER */

        if (req.query.status) {
            if (!VALID_STATUSES.includes(req.query.status)) {
                return sendError(res, 400, "Invalid order status.");
            }

            filter.orderStatus = req.query.status;
        }

        /* SEARCH FILTER */

        if (req.query.search) {
            const searchText = cleanString(req.query.search);

            if (searchText.length > 100) {
                return sendError(
                    res,
                    400,
                    "Search text is too long."
                );
            }

            if (searchText) {
                const search = escapeRegex(searchText);

                filter.$or = [
                    {
                        orderNumber: {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        "customer.name": {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        "customer.email": {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        "customer.phone": {
                            $regex: search,
                            $options: "i"
                        }
                    }
                ];
            }
        }

        /* DATE FILTER */

        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};

            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);

                if (Number.isNaN(startDate.getTime())) {
                    return sendError(
                        res,
                        400,
                        "Invalid start date."
                    );
                }

                filter.createdAt.$gte = startDate;
            }

            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);

                if (Number.isNaN(endDate.getTime())) {
                    return sendError(
                        res,
                        400,
                        "Invalid end date."
                    );
                }

                endDate.setUTCHours(23, 59, 59, 999);

                filter.createdAt.$lte = endDate;
            }

            if (
                filter.createdAt.$gte &&
                filter.createdAt.$lte &&
                filter.createdAt.$gte > filter.createdAt.$lte
            ) {
                return sendError(
                    res,
                    400,
                    "Start date cannot be after end date."
                );
            }
        }

        const [orders, totalOrders] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Order.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            totalOrders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            pageSize: limit,
            orders
        });

    } catch (error) {
        console.error("Get orders error:", error);

        return sendError(
            res,
            500,
            "Unable to retrieve orders."
        );
    }
};


/* =====================================================
   5. GET SINGLE ORDER
   Admin only
   ===================================================== */

export const getOrderById = async (req, res) => {
    try {
        const identifier = req.params.id;

        let order;

        if (mongoose.isValidObjectId(identifier)) {
            order = await Order.findById(identifier).lean();
        } else {
            order = await Order.findOne({
                orderNumber: identifier
            }).lean();
        }

        if (!order) {
            return sendError(res, 404, "Order not found.");
        }

        return res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Get order details error:", error);

        return sendError(
            res,
            500,
            "Unable to retrieve order details."
        );
    }
};


/* =====================================================
   6. UPDATE ORDER STATUS
   Admin only
   ===================================================== */

export const updateOrderStatus = async (req, res) => {
    let session;

    try {
        const { orderStatus } = req.body || {};
        const note = req.body?.note;

        if (!VALID_STATUSES.includes(orderStatus)) {
            return sendError(
                res,
                400,
                "Invalid order status."
            );
        }

        if (
            note !== undefined &&
            (typeof note !== "string" || note.length > 500)
        ) {
            return sendError(
                res,
                400,
                "Status note must be 500 characters or fewer."
            );
        }

        const cleanNote = cleanString(note);

        if (!mongoose.isValidObjectId(req.params.id)) {
            return sendError(res, 400, "Invalid order ID.");
        }

        session = await mongoose.startSession();

        let updatedOrder;
        let transitionError = null;

        await session.withTransaction(async () => {
            const order = await Order.findById(
                req.params.id
            ).session(session);

            if (!order) {
                transitionError = "ORDER_NOT_FOUND";
                return;
            }

            if (order.orderStatus === orderStatus) {
                updatedOrder = order;
                return;
            }

            const allowedTransitions =
                STATUS_TRANSITIONS[order.orderStatus] || [];

            if (!allowedTransitions.includes(orderStatus)) {
                transitionError = "INVALID_STATUS_TRANSITION";
                return;
            }

            /*
              Restore stock exactly once when an order is cancelled.
              The transition rules prevent repeated cancellation.
            */

            if (orderStatus === "cancelled") {
                for (const item of order.items) {
                    const stockUpdate = await Product.updateOne(
                        { _id: item.product },
                        {
                            $inc: { stock: item.quantity }
                        },
                        { session }
                    );

                    if (stockUpdate.matchedCount !== 1) {
                        throw new Error("PRODUCT_STOCK_RESTORE_FAILED");
                    }
                }
            }

            order.orderStatus = orderStatus;

            order.statusHistory.push({
                status: orderStatus,
                note: cleanNote ||
                    `Order status changed to ${orderStatus}.`,
                changedAt: new Date()
            });

            updatedOrder = await order.save({ session });
        });

        if (transitionError === "ORDER_NOT_FOUND") {
            return sendError(res, 404, "Order not found.");
        }

        if (transitionError === "INVALID_STATUS_TRANSITION") {
            return sendError(
                res,
                400,
                "This order status change is not allowed."
            );
        }

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully.",
            order: updatedOrder
        });

    } catch (error) {
        console.error("Update order status error:", error);

        if (error.message === "PRODUCT_STOCK_RESTORE_FAILED") {
            return sendError(
                res,
                500,
                "Unable to restore product stock. Order was not cancelled."
            );
        }

        return sendError(
            res,
            500,
            "Unable to update order status."
        );

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};


/* =====================================================
   7. GET ORDER STATISTICS
   Admin only
   ===================================================== */

export const getOrderStats = async (req, res) => {
    try {
        const [
            totalOrders,
            pendingOrders,
            confirmedOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            paidOrders,
            revenueResult
        ] = await Promise.all([

            Order.countDocuments(),

            Order.countDocuments({
                orderStatus: "pending"
            }),

            Order.countDocuments({
                orderStatus: "confirmed"
            }),

            Order.countDocuments({
                orderStatus: "processing"
            }),

            Order.countDocuments({
                orderStatus: "shipped"
            }),

            Order.countDocuments({
                orderStatus: "delivered"
            }),

            Order.countDocuments({
                orderStatus: "cancelled"
            }),

            Order.countDocuments({
                paymentStatus: "paid"
            }),

            Order.aggregate([
                {
                    $match: {
                        paymentStatus: "paid",
                        orderStatus: { $ne: "cancelled" }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$total" }
                    }
                }
            ])
        ]);

        return res.status(200).json({
            success: true,

            stats: {
                totalOrders,
                pendingOrders,
                confirmedOrders,
                processingOrders,
                shippedOrders,
                deliveredOrders,
                cancelledOrders,
                paidOrders,
                revenue: roundMoney(
                    revenueResult[0]?.revenue || 0
                )
            }
        });

    } catch (error) {
        console.error("Order statistics error:", error);

        return sendError(
            res,
            500,
            "Unable to retrieve order statistics."
        );
    }
};
