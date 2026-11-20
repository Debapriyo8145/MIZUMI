
import express from "express";

import {
    createOrder,
    getMyOrders,
    getMyOrderById,
    getOrders,
    getOrderById,
    updateOrderStatus,
    getOrderStats
} from "../controllers/orderController.js";

import { protectAdmin } from "../middleware/authMiddleware.js";

import {
    protectCustomer,
    optionalProtectCustomer
} from "../middleware/customerAuthMiddleware.js";


const router = express.Router();


/* -------------------- CREATE ORDER -------------------- */

// Guest checkout remains available.
// Logged-in customer orders are linked to their account.
router.post("/", optionalProtectCustomer, createOrder);


/* -------------------- CUSTOMER ORDER HISTORY -------------------- */

// These must appear before the admin /:id route.
router.get("/my", protectCustomer, getMyOrders);
router.get("/my/:id", protectCustomer, getMyOrderById);


/* -------------------- ADMIN ROUTES -------------------- */

router.get("/stats", protectAdmin, getOrderStats);

router.get("/", protectAdmin, getOrders);

router.get("/:id", protectAdmin, getOrderById);

router.patch("/:id/status", protectAdmin, updateOrderStatus);


export default router;
