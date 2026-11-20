
import express from "express";
import rateLimit from "express-rate-limit";
import { adminLogin } from "../controllers/authController.js";

const router = express.Router();

// Limit repeated login attempts to reduce brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

router.post("/login", loginLimiter, adminLogin);

export default router;
