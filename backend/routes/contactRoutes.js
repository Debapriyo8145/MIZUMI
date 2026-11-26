import express from "express";
import rateLimit from "express-rate-limit";

import {
    submitContact,
    listContacts,
    getContact,
    updateContactStatus,
    deleteContact,
    replyToContact
} from "../controllers/contactController.js";

import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================
   PUBLIC RATE LIMITER
   Max 5 submissions per 15 minutes per IP.
========================================= */

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many messages from your network. Please try again in 15 minutes."
    }
});

/* =========================================
   PUBLIC — Submit contact message
========================================= */

router.post("/", contactLimiter, submitContact);

/* =========================================
   ADMIN — Manage contact messages
========================================= */

router.get("/", protectAdmin, listContacts);
router.get("/:id", protectAdmin, getContact);
router.patch("/:id", protectAdmin, updateContactStatus);
router.delete("/:id", protectAdmin, deleteContact);
router.post("/:id/reply", protectAdmin, replyToContact);

export default router;