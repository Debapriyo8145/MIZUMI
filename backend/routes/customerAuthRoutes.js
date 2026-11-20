
import express from "express";

import {
    registerCustomer,
    loginCustomer,
    getMyCustomerProfile,
    updateMyCustomerProfile,
    logoutCustomer
} from "../controllers/customerAuthController.js";

import { protectCustomer } from "../middleware/customerAuthMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

// Protected routes
router.get("/me", protectCustomer, getMyCustomerProfile);
router.patch("/me", protectCustomer, updateMyCustomerProfile);

// Logout
router.post("/logout", logoutCustomer);

export default router;
