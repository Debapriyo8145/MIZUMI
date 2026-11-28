
import express from "express";
import rateLimit from "express-rate-limit";

import {
    registerCustomer,
    loginCustomer,
    verifyCustomerEmail,
    resendCustomerVerification,
    getMyCustomerProfile,
    updateMyCustomerProfile,
    logoutCustomer
} from "../controllers/customerAuthController.js";

import { protectCustomer } from "../middleware/customerAuthMiddleware.js";

const router = express.Router();

const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many registration attempts. Please try again later."
    }
});

const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many verification requests. Please try again later."
    }
});

// Public routes
router.post("/register", registrationLimiter, registerCustomer);
router.post("/login", loginCustomer);
router.post("/verify-email", verificationLimiter, verifyCustomerEmail);
router.post("/resend-verification", verificationLimiter, resendCustomerVerification);

// Protected routes
router.get("/me", protectCustomer, getMyCustomerProfile);
router.patch("/me", protectCustomer, updateMyCustomerProfile);

// Logout
router.post("/logout", logoutCustomer);

export default router;
