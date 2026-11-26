
import express from "express";

import {
    getAnnouncement,
    updateAnnouncement
} from "../controllers/announcementController.js";

import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: website can retrieve the announcement.
router.get("/", getAnnouncement);

// Protected: only logged-in admin can update it.
router.put("/", protectAdmin, updateAnnouncement);

export default router;
